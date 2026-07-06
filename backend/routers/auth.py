import os
import datetime
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session
import jwt  # PyJWT
import bcrypt

from database.database import get_db
from models.db_models import User
from models.schemas import UserSignup, UserLogin, Token, UserOut, TokenData, UserProfileUpdate, UserPasswordUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Security Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip()
if not SECRET_KEY:
    raise RuntimeError(
        "FATAL: JWT_SECRET_KEY environment variable is not set! "
        "Set it in your .env file. Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30   # Short-lived access token (was 60)
REFRESH_TOKEN_EXPIRE_DAYS = 7      # Long-lived refresh token for session continuity
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "False").strip().lower() == "true"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# --- Rate Limiting (IP-based) ---
rate_limit_records = defaultdict(list)

def rate_limit(limit: int, window_seconds: int):
    def dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        # Clean old records
        rate_limit_records[client_ip] = [t for t in rate_limit_records[client_ip] if t > now - window_seconds]
        if len(rate_limit_records[client_ip]) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
        rate_limit_records[client_ip].append(now)
    return dependency

# --- Brute Force Login Lockout ---
# email -> {"attempts": count, "lockout_until": timestamp}
login_lockouts = defaultdict(lambda: {"attempts": 0, "lockout_until": 0.0})

def check_login_lockout(email: str):
    now = time.time()
    record = login_lockouts[email]
    if record["lockout_until"] > now:
        remaining = int(record["lockout_until"] - now)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Too many failed login attempts. Account locked. Please try again in {remaining} seconds."
        )

def register_failed_login(email: str):
    record = login_lockouts[email]
    record["attempts"] += 1
    if record["attempts"] >= 5:
        record["lockout_until"] = time.time() + 900  # 15 minutes lockout
        record["attempts"] = 0  # reset attempts count for next lockout cycle

def register_successful_login(email: str):
    if email in login_lockouts:
        del login_lockouts[email]

# --- Token Blacklist (Logout Invalidation) ---
# In production, use Redis or a DB table for persistence across restarts.
# Stores token strings that have been revoked via logout.
token_blacklist: set = set()

# --- Password Hashing ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)  # Explicit cost factor 12 for strong hashing
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

# --- JWT Token Creation ---

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    """Creates a long-lived refresh token for session continuity."""
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- Current User Dependency ---

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_str = None
    
    # 1. Try Authorization header
    authorization = request.headers.get("Authorization")
    if authorization:
        scheme, param = get_authorization_scheme_param(authorization)
        if scheme.lower() == "bearer":
            token_str = param
            
    # 2. Try httpOnly cookie (secure — not accessible via JavaScript)
    if not token_str:
        token_str = request.cookies.get("access_token")
    
    # NOTE: Query parameter token support intentionally removed
    # to prevent token leakage via browser history, server logs, and referrer headers.
        
    if not token_str:
        raise credentials_exception
    
    # Check if token has been blacklisted (revoked via logout)
    if token_str in token_blacklist:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
        # Ensure this is an access token, not a refresh token
        token_type = payload.get("type")
        if token_type is not None and token_type != "access":
            raise credentials_exception
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(email=email, user_id=user_id)
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user

# --- Auth Endpoints ---

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit(limit=30, window_seconds=60))])
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered."
        )
    
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token, dependencies=[Depends(rate_limit(limit=5, window_seconds=60))])
def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    check_login_lockout(credentials.email)
    
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        register_failed_login(credentials.email)
        # Generic error message to prevent account enumeration
        # (same message whether email exists or not)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    register_successful_login(credentials.email)
    
    token_data = {"sub": user.email, "user_id": user.id}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
    # Set httpOnly cookie for access token (short-lived)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=COOKIE_SECURE
    )
    
    # Set httpOnly cookie for refresh token (long-lived)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        expires=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=COOKIE_SECURE
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token (cookie-based)."""
    refresh_token_str = request.cookies.get("refresh_token")
    
    if not refresh_token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided"
        )
    
    # Check if refresh token is blacklisted (logged out)
    if refresh_token_str in token_blacklist:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )
    
    try:
        payload = jwt.decode(refresh_token_str, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please log in again."
        )
    
    # Verify user still exists in database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Issue new access token
    new_access_token = create_access_token(data={"sub": email, "user_id": user_id})
    
    # Set new access token cookie
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=COOKIE_SECURE
    )
    
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(request: Request, response: Response):
    # Blacklist current access token so it can't be reused after logout
    access_token_str = request.cookies.get("access_token")
    if access_token_str:
        token_blacklist.add(access_token_str)
    
    # Blacklist refresh token too
    refresh_token_str = request.cookies.get("refresh_token")
    if refresh_token_str:
        token_blacklist.add(refresh_token_str)
    
    # Clear both cookies
    response.delete_cookie(key="access_token", samesite="lax")
    response.delete_cookie(key="refresh_token", samesite="lax")
    return {"detail": "Successfully logged out"}

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserOut)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.name is not None:
        current_user.name = profile_data.name
    
    if profile_data.email is not None:
        # Check if email is already taken by another user
        if profile_data.email != current_user.email:
            existing = db.query(User).filter(User.email == profile_data.email).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email address already registered by another user."
                )
            current_user.email = profile_data.email
            
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/password")
def update_password(
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Hash new password and save
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    return {"detail": "Password successfully updated."}
