"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "src/services/api";
import { 
  User, ShieldAlert, Loader2, CheckCircle2, Key, Info, Check, X, ArrowLeft
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

  const passwordChecks = useMemo(() => getPasswordChecks(newPassword), [newPassword]);
  const allChecksPassed = passwordChecks.every((c) => c.met);

  // Initial load: fetch current user
  useEffect(() => {
    const isLoggedIn = typeof window !== "undefined" ? localStorage.getItem("reviewsense_logged_in") === "true" : false;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    apiService.getMe()
      .then((user) => {
        setName(user.name);
        setEmail(user.email);
      })
      .catch((err) => {
        console.error("Failed to load user info", err);
        router.push("/login");
      });
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
          <p className="text-sm text-slate-500 dark:text-slate-400">Update your profile settings and password</p>
        </div>
      </div>

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
    </div>
  );
}
