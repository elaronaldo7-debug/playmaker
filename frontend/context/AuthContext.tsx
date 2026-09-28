import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import api, { saveToken, getToken, clearToken, setUnauthorizedHandler, apiErrorMessage } from "@/services/api";

export type Role = "ADMIN" | "COACH";

export interface CoachInfo {
  id: number;
  coach_name: string;
  category_id: number | null;
  category_name: string | null;
}

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;
  coach?: CoachInfo | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout, we clear the token locally regardless
    }
    await clearToken();
    setUser(null);
    router.replace("/login");
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get<AuthUser>("/auth/me");
      setUser(data);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      router.replace("/login");
    });
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (username: string, password: string) => {
    setLoginError(null);
    try {
      const { data } = await api.post("/auth/login", { username, password });
      await saveToken(data.access_token);
      setUser(data.user);
      router.replace("/dashboard");
    } catch (error) {
      const message = apiErrorMessage(error, "Login failed. Please try again.");
      setLoginError(message);
      throw error;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    loginError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
