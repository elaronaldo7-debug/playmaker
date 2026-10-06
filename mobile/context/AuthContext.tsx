import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { router } from "expo-router";

import api, {
  saveToken,
  getToken,
  clearToken,
  setUnauthorizedHandler,
  apiErrorMessage,
} from "@/services/api";

// ==================================================
// TYPES
// ==================================================

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
  login: (
    username: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginError: string | null;
}

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  );

// ==================================================
// PROVIDER
// ==================================================

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loginError, setLoginError] =
    useState<string | null>(null);

  // ==================================================
  // LOGOUT
  // ==================================================

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout API errors.
      // Local logout should still continue.
    }

    /*
     * Token is cleared ONLY when the user
     * manually logs out.
     */
    await clearToken();

    setUser(null);
    setLoginError(null);

    router.replace("/login");
  }, []);

  // ==================================================
  // REFRESH USER
  // ==================================================

  const refreshUser = useCallback(async () => {
    const token = await getToken();

    // No saved token -> user must login.
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response =
        await api.get<AuthUser>("/auth/me");

      setUser(response.data);
    } catch (error) {
      console.log(
        "AUTH ME ERROR:",
        error
      );

      /*
       * IMPORTANT:
       *
       * Do NOT clear the saved token here.
       *
       * Render may be sleeping, network may be
       * temporarily unavailable, or the request
       * may timeout.
       *
       * Keeping the token prevents the user from
       * being forced to login again because of a
       * temporary server/network problem.
       */

      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==================================================
  // STARTUP
  // ==================================================

  useEffect(() => {
    setUnauthorizedHandler(() => {
      /*
       * Do not clear the token here.
       *
       * The token should only be removed by
       * the manual logout function.
       */

      setUser(null);
      router.replace("/login");
    });

    refreshUser();
  }, [refreshUser]);

  // ==================================================
  // LOGIN
  //
  // FIXED: the backend's /auth/login response key is
  // read defensively as EITHER "access_token" OR
  // "token" -- whichever the backend actually sends.
  // Previously this only checked "access_token"; if
  // the backend returned "token" instead, accessToken
  // was always undefined, the function threw before
  // saveToken()/setUser() ever ran, and the user was
  // silently kept on the login screen forever (the
  // "asks to login every time" symptom).
  // ==================================================

  const login = useCallback(
    async (
      username: string,
      password: string
    ) => {
      setLoginError(null);

      try {
        console.log(
          "LOGIN START:",
          username
        );

        const response =
          await api.post<{
            access_token?: string;
            token?: string;
            user: AuthUser;
          }>("/auth/login", {
            username,
            password,
          });

        console.log(
          "LOGIN API RESPONSE:",
          response.data
        );

        // Accept whichever key the backend actually sends.
        const accessToken =
          response.data?.access_token ||
          response.data?.token;

        const loggedInUser =
          response.data?.user;

        if (!accessToken) {
          throw new Error(
            "Login succeeded but no token was returned. " +
              "Check that the backend's /auth/login response " +
              "key (access_token vs token) matches what the " +
              "app expects."
          );
        }

        if (!loggedInUser) {
          throw new Error(
            "Login succeeded but user information was not returned."
          );
        }

        // Save token in SecureStore (native) / localStorage (web).
        await saveToken(
          accessToken
        );

        console.log(
          "TOKEN SAVED"
        );

        // Set authenticated user.
        setUser(
          loggedInUser
        );

        console.log(
          "USER SET:",
          loggedInUser
        );

        router.replace(
          "/dashboard"
        );

        console.log(
          "LOGIN COMPLETE"
        );
      } catch (error) {
        console.error(
          "LOGIN ERROR:",
          error
        );

        const message =
          apiErrorMessage(
            error,
            "Login failed. Please try again."
          );

        setLoginError(
          message
        );

        throw error;
      }
    },
    []
  );

  // ==================================================
  // CONTEXT VALUE
  // ==================================================

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    loginError,
  };

  // ==================================================
  // PROVIDER
  // ==================================================

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ==================================================
// HOOK
// ==================================================

export function useAuth(): AuthContextValue {
  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return ctx;
}