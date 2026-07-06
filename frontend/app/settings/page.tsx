"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "src/services/api";
import { 
  User, ShieldAlert, Loader2, CheckCircle2, Key, Info, Check, X, ArrowLeft, ShieldCheck, QrCode, Copy
} from "lucide-react";
import Link from "next/link";

// Password strength requirement checklist
function getPasswordChecks(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "One number (0-9)", met: /[0-9]/.test(password) },
    { label: "One special character (!@#$%^&*)", met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]/.test(password) },
  ];
}

export default function SettingsPage() {
  const router = useRouter();
  
  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 2FA state
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [twoFaSecret, setTwoFaSecret] = useState("");
  const [twoFaQrCode, setTwoFaQrCode] = useState("");
  const [twoFaVerifyCode, setTwoFaVerifyCode] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaSuccess, setTwoFaSuccess] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 2FA Disable state
  const [show2faDisableConfirm, setShow2faDisableConfirm] = useState(false);
  const [twoFaDisableCode, setTwoFaDisableCode] = useState("");

  const passwordChecks = useMemo(() => getPasswordChecks(newPassword), [newPassword]);
  const allChecksPassed = passwordChecks.every((c) => c.met);

  // Initial load: fetch current user
  const fetchUserInfo = () => {
    const isLoggedIn = typeof window !== "undefined" ? localStorage.getItem("reviewsense_logged_in") === "true" : false;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    apiService.getMe()
      .then((user) => {
        setName(user.name);
        setEmail(user.email);
        setIs2faEnabled(user.is_2fa_enabled);
      })
      .catch((err) => {
        console.error("Failed to load user info", err);
        router.push("/login");
      });
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    
    if (!name.trim() || !email.trim()) {
      setProfileError("Name and Email cannot be empty.");
      return;
    }

    setProfileLoading(true);
    try {
      await apiService.updateProfile(name, email);
      setProfileSuccess("Profile updated successfully!");
      // Notify Navbar to update user name
      window.dispatchEvent(new Event("auth-state-change"));
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (!allChecksPassed) {
      setPasswordError("Please meet all password requirements.");
      return;
    }

    setPasswordLoading(true);
    try {
      await apiService.updatePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password. Please check your credentials.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // 2FA Setup
  const handleInitiate2fa = async () => {
    setTwoFaError("");
    setTwoFaSuccess("");
    setTwoFaLoading(true);
    try {
      const data = await apiService.setup2fa();
      setTwoFaSecret(data.secret);
      setTwoFaQrCode(data.qr_code);
      setShow2faSetup(true);
    } catch (err: any) {
      setTwoFaError(err.message || "Failed to generate 2FA setup details.");
    } finally {
      setTwoFaLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(twoFaSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleConfirm2faEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError("");
    setTwoFaSuccess("");
    
    if (twoFaVerifyCode.length !== 6) {
      setTwoFaError("Please enter a valid 6-digit code.");
      return;
    }

    setTwoFaLoading(true);
    try {
      await apiService.enable2fa(twoFaVerifyCode);
      setTwoFaSuccess("Two-factor authentication enabled successfully!");
      setIs2faEnabled(true);
      setShow2faSetup(false);
      setTwoFaSecret("");
      setTwoFaQrCode("");
      setTwoFaVerifyCode("");
      fetchUserInfo(); // Refresh user details
    } catch (err: any) {
      setTwoFaError(err.message || "Invalid code. Please try scanning again.");
    } finally {
      setTwoFaLoading(false);
    }
  };

  // 2FA Disable
  const handleConfirm2faDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError("");
    setTwoFaSuccess("");

    if (twoFaDisableCode.length !== 6) {
      setTwoFaError("Please enter a valid 6-digit verification code to disable 2FA.");
      return;
    }

    setTwoFaLoading(true);
    try {
      await apiService.disable2fa(twoFaDisableCode);
      setTwoFaSuccess("Two-factor authentication disabled successfully.");
      setIs2faEnabled(false);
      setShow2faDisableConfirm(false);
      setTwoFaDisableCode("");
      fetchUserInfo(); // Refresh details
    } catch (err: any) {
      setTwoFaError(err.message || "Invalid verification code.");
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link 
          href="/dashboard" 
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Account Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Update your profile settings and secure your account</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Profile Settings Block */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Details</h2>
                <p className="text-xs text-slate-500">Update your public name and login email</p>
              </div>
            </div>

            {profileSuccess && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
                <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50">
                <ShieldAlert className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating Profile...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Block */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Change Password</h2>
                <p className="text-xs text-slate-500">Update password securely</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
                <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50">
                <ShieldAlert className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                />

                {/* Password Requirements Checklist */}
                {newPassword.length > 0 && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Requirements</p>
                    <ul className="space-y-1">
                      {passwordChecks.map((check, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-xs">
                          {check.met ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                          )}
                          <span className={check.met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}>
                            {check.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading || !allChecksPassed || newPassword !== confirmPassword}
                  className="flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Two-Factor Authentication (2FA) Block */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h2>
                <p className="text-xs text-slate-500">Secure your account with dynamic TOTP codes using Google or Microsoft Authenticator</p>
              </div>
            </div>
            
            {/* 2FA Badges */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              is2faEnabled 
                ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50" 
                : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800"
            }`}>
              <span className={`h-2.5 w-2.5 rounded-full ${is2faEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {is2faEnabled ? "2FA Enabled" : "2FA Disabled"}
            </span>
          </div>

          {twoFaSuccess && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
              <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{twoFaSuccess}</span>
            </div>
          )}

          {twoFaError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50">
              <ShieldAlert className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{twoFaError}</span>
            </div>
          )}

          {/* 1. View setup (QR Code scanning state) */}
          {show2faSetup && (
            <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-150 dark:bg-slate-950 dark:border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                {twoFaQrCode ? (
                  <img src={twoFaQrCode} alt="2FA QR Code" className="h-40 w-40" />
                ) : (
                  <QrCode className="h-20 w-20 text-slate-350 animate-pulse" />
                )}
                <span className="text-[10px] text-slate-400 dark:text-slate-550 mt-2 font-mono uppercase tracking-wider">Scan with Authenticator</span>
              </div>

              <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Scan the QR code or enter code manually</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Scan the barcode on the left using Google Authenticator, Microsoft Authenticator, or any compatible TOTP app. If scanning is not working, enter this key manually:
                  </p>
                  
                  {/* Manual Key Display */}
                  <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 border border-slate-200 font-mono text-xs dark:bg-slate-900 dark:border-slate-800">
                    <span className="flex-1 text-slate-700 dark:text-slate-300 font-bold select-all tracking-wider">{twoFaSecret}</span>
                    <button
                      onClick={copyToClipboard}
                      className="p-1 rounded text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title="Copy Key"
                    >
                      {copiedSecret ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Verification Code form */}
                <form onSubmit={handleConfirm2faEnable} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1">
                    <input
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      placeholder="Enter 6-digit code"
                      value={twoFaVerifyCode}
                      onChange={(e) => setTwoFaVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-center font-mono font-bold tracking-widest dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={twoFaLoading || twoFaVerifyCode.length !== 6}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {twoFaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify & Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShow2faSetup(false);
                        setTwoFaSecret("");
                        setTwoFaQrCode("");
                        setTwoFaVerifyCode("");
                        setTwoFaError("");
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all dark:border-slate-850 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Show disable verification confirmation */}
          {show2faDisableConfirm && (
            <div className="mt-4 p-5 rounded-2xl bg-red-50/20 border border-red-100 dark:bg-red-950/5 dark:border-red-900/40 animate-in fade-in duration-300">
              <h4 className="text-sm font-bold text-red-700 dark:text-red-400">Are you sure you want to disable 2FA?</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Disabling two-factor authentication will lower your account security. Please verify your identity by entering the current code from your authenticator app:
              </p>
              
              <form onSubmit={handleConfirm2faDisable} className="mt-4 flex flex-col sm:flex-row gap-2.5 max-w-md">
                <div className="flex-1">
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="Enter 6-digit code"
                    value={twoFaDisableCode}
                    onChange={(e) => setTwoFaDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="block w-full rounded-xl border border-slate-355 px-3.5 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm text-center font-mono font-bold tracking-widest dark:bg-slate-955 dark:border-slate-800 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={twoFaLoading || twoFaDisableCode.length !== 6}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {twoFaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Disable 2FA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShow2faDisableConfirm(false);
                      setTwoFaDisableCode("");
                      setTwoFaError("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all dark:border-slate-850 dark:bg-slate-955 dark:text-slate-350 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. Base layout states when no active flow setup/disable is displayed */}
          {!show2faSetup && !show2faDisableConfirm && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-950 dark:border-slate-850">
              <div className="flex items-start gap-2.5 max-w-xl">
                <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  {is2faEnabled 
                    ? "Your account is extra secure. When signing in, you will be prompted to enter a verification code generated dynamically by your authenticator device."
                    : "For extra account security, scan the 2FA configurations with Google Authenticator or Microsoft Authenticator. It prevents unauthorized logins even if someone gets your password."
                  }
                </p>
              </div>

              {is2faEnabled ? (
                <button
                  type="button"
                  onClick={() => setShow2faDisableConfirm(true)}
                  className="w-full sm:w-auto shrink-0 rounded-xl border border-red-200 bg-red-50/20 px-4 py-2 text-xs font-bold text-red-650 hover:bg-red-50 hover:text-red-700 transition-all dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer"
                >
                  Disable 2FA
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleInitiate2fa}
                  disabled={twoFaLoading}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4.5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-850 active:scale-95 transition-all dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer"
                >
                  {twoFaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enable 2FA"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
