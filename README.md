# 📊 ReviewSense AI

ReviewSense AI is a state-of-the-art, secure, and modern Product Review Sentiment Analysis and Brand Intelligence platform. It allows businesses and developers to upload customer reviews (via CSV), analyze sentiments using a **locally fine-tuned BERT model**, visualize analytics, export PDF/CSV reports, and chat interactively with review data using **Groq-powered LLMs** (Llama 3.1).

---

## ✨ Features

### 1. 🔒 Enterprise-Grade Security
* **Two-Factor Authentication (2FA):** Dynamic TOTP algorithm setup. Scan generated QR codes with Google Authenticator, Microsoft Authenticator, or any compatible app. Requires temporary token validation before issuing secure cookies.
* **httpOnly Session Cookies:** Session tokens (`access_token` & `refresh_token`) are stored in secure browser cookies, completely mitigating the risk of Cross-Site Scripting (XSS) token theft.
* **Token Refresh Rotation:** Automatic token refresh workflow handles short-lived access tokens (30 mins) and long-lived refresh tokens (7 days) seamlessly.
* **Brute-Force & Rate Limiting:** Brute force lockout (5 failed attempts locks account for 15 mins) and IP-based rate limiting on sensitive login/signup endpoints.
* **Safe File Uploads:** Uploaded CSVs are validated by size, extension, and content type. Filenames are randomized with UUIDs to block Path Traversal attacks.
* **Generic Error Messages:** Prevents account enumeration vulnerability by using uniform messages for incorrect authentication attempts.

### 2. ⚙️ Account Settings & UX Polish
* **Interactive Profile Panel:** Dynamic workspace under settings to change user name, email, and update passwords with client-side strength checks.
* **Logout Validation Popup:** Premium custom confirmation modal with backdrop-blur styling to replace basic native browser alerts.

### 3. 🧠 Smart Review Analysis
* **Local BERT Model:** Sentiment classification runs locally on the backend using a fine-tuned BERT model, ensuring 100% data privacy and sub-second batch inference.
* **Groq LLM Insights:** Automatically aggregates customer complaints, appreciated product features, and actionable business recommendations via Llama 3.1.
* **Natural Language Chat:** Ask natural language questions like *"Why are customers complaining about the screen?"* and get insights compiled directly from matching reviews.
* **Interactive Dashboard:** Beautiful charts showing sentiment distributions, confidence level distribution, and a paginated review explorer.

### 📄 Secure Report Export
* Export clean spreadsheet logs (`.csv`) of classified reviews.
* Download a comprehensive PDF business report containing key metrics, charts, and LLM-generated recommendations.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (React), Tailwind CSS, Lucide Icons, Recharts
* **Backend:** FastAPI, SQLAlchemy (ORM), PyJWT, bcrypt, Uvicorn
* **Database:** SQLite (local development)
* **Model/LLM:** Hugging Face BERT (local), Groq SDK (Llama 3.1 8B Instant)

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10+
* Node.js 18+

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the `backend/` directory:
   ```env
   JWT_SECRET_KEY=your-64-character-hex-string
   GROQ_API_KEY=your-groq-api-key
   ```
   *Tip: Generate a strong secret key using: `python -c "import secrets; print(secrets.token_hex(32))"`*

5. Run the backend server:
   ```bash
   python main.py
   ```
   *The backend will start on [http://localhost:8000](http://localhost:8000) (API Docs at `/docs`).*

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install packages:
   ```bash
   npm install
   ```

3. Configure environment variables (optional, defaults to `http://localhost:8000`):
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Launch the development server:
   ```bash
   npm run dev
   ```
   *The application will be accessible at [http://localhost:3000](http://localhost:3000).*

---

## 📂 Project Structure

```
├── backend/
│   ├── database/        # SQLite connection setup
│   ├── models/          # SQLAlchemy schemas & db models
│   ├── routers/         # REST API endpoints (auth, projects, analytics, reports, insights)
│   ├── services/        # Local BERT inference & Groq integration logic
│   ├── uploads/         # Temporary sandboxed directory for CSV uploads
│   └── main.py          # FastAPI application entrypoint
├── frontend/
│   ├── app/             # Next.js page routers (dashboard, project analysis, login, signup)
│   ├── components/      # Reusable UI elements (Navbar, layouts)
│   ├── hooks/           # Custom React hooks (useAuth)
│   └── services/        # Secure API HTTP request logic (cookie-based)
└── README.md            # You are here!
```

---

## 🔒 License
This project is open-source and available under the MIT License.
