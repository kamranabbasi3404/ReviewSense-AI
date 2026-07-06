"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "src/services/api";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchUser = async () => {
    // Try to fetch user profile. Works if:
    // 1. In-memory token exists (same session, after login), OR
    // 2. httpOnly cookie exists (browser sends it automatically)
    try {
      const userData = await apiService.getMe();
      setUser(userData);
    } catch (err) {
      // No valid session — user needs to log in
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await apiService.login(email, password);
      await fetchUser();
      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      await apiService.signup(name, email, password);
      await apiService.login(email, password);
      await fetchUser();
      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    router.push("/login");
  };

  return {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };
}
