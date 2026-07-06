"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiService } from "src/services/api";
import { BarChart3, LogOut, PlusCircle, User, Loader2 } from "lucide-react";

interface UserProfile {
  id: number;
  name: string;
  email: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const isLoggedIn = typeof window !== "undefined" ? localStorage.getItem("reviewsense_logged_in") === "true" : false;
    if (!isLoggedIn) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiService.getMe();
      setUser(data);
    } catch (_) {
      apiService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    
    // Add custom event listener for auth changes
    const handleAuthChange = () => {
      fetchUser();
    };
    window.addEventListener("auth-state-change", handleAuthChange);
    return () => {
      window.removeEventListener("auth-state-change", handleAuthChange);
    };
  }, [pathname]);

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    window.dispatchEvent(new Event("auth-state-change"));
    router.push("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isAuthPage) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-semibold text-slate-900 transition-opacity hover:opacity-90 dark:text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 bg-clip-text text-xl font-bold tracking-tight text-transparent dark:from-white dark:to-indigo-200">
              ReviewSense <span className="text-indigo-600 dark:text-indigo-400">AI</span>
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex items-center gap-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${
                  pathname === "/dashboard"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/projects/new"
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-indigo-100 hover:shadow-md active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                <PlusCircle className="h-4 w-4" />
                New Project
              </Link>

              {/* Profile Menu */}
              <div className="flex items-center gap-3 border-l border-slate-200 pl-4 dark:border-slate-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-semibold text-indigo-700 dark:from-indigo-950 dark:to-violet-950 dark:text-indigo-300">
                  {getInitials(user.name)}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
