"use client";

import { useEffect, useState } from "react";
import { Cookie, X, Check, ShieldAlert } from "lucide-react";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("reviewsense_cookie_consent");
    if (!consent) {
      // Delay visibility slightly for a smooth slide-in effect
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("reviewsense_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem("reviewsense_cookie_consent", "rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md z-50 animate-in slide-in-from-bottom-10 duration-500">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-2xl backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-900/85">
        {/* Background glow decorator */}
        <div className="absolute -top-10 -right-10 -z-10 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />
        
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-100 dark:shadow-none">
            <Cookie className="h-5 w-5 animate-pulse" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                We Value Your Privacy
              </h3>
              <button
                onClick={handleReject}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              We use secure cookies to keep you signed in, manage your analysis workspace, and process file uploads. By clicking <b>"Accept Cookies"</b>, you enable full session management features.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800/80">
          <button
            onClick={handleReject}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all dark:border-slate-850 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-900 cursor-pointer"
          >
            Reject All
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-slate-850 active:scale-95 transition-all dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            Accept Cookies
          </button>
        </div>
      </div>
    </div>
  );
}
