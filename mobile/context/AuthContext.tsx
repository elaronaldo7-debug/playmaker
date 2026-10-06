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
      // Ignore API logout errors.
      // Local logout must still continue.
    }

    // Token is cleared ONLY on manual logout.
    await clearToken();

    setUser(null);
    setLoginError(null);

    router.replace("/login");
  }, []);

  // ==================================================
  // REFRESH USER
  // ==================================================

  const refreshUser = useCallback(async () => {
    console.log("================================");
    console.log("AUTH STARTUP CHECK");
    console.log("================================");

    const token = await getToken();

    // --------------------------------------------------
    // NO TOKEN
    // --------------------------------------------------

    if (!token) {
      console.log(
        "AUTH STARTUP: NO TOKEN"
      );

      setUser(null);
      setIsLoading(false);

      return;
    }

    console.log(
      "AUTH STARTUP: TOKEN FOUND"
    );

    // --------------------------------------------------
    // TOKEN EXISTS
    // --------------------------------------------------

    try {
      const response =
        await api.get<AuthUser>(
          "/auth/me"
        );

      console.log(
        "AUTH STARTUP: /auth/me SUCCESS"
      );

      console.log(
        "AUTH USER:",
        response.data
      );

      setUser(
        response.data
      );
    } catch (error: any) {
      console.log(
        "AUTH STARTUP /auth/me ERROR:",
        error
      );

      const status =
        error?.response?.status;

      // ------------------------------------------------
      // IMPORTANT
      //
      // Do NOT clear the token because of:
      // - Render cold start
      // - Internet delay
      // - timeout
      // - temporary server error
      // ------------------------------------------------

      if (status !== 401) {
        console.log(
          "AUTH STARTUP: TEMPORARY ERROR"
        );

        console.log(
          "TOKEN WILL BE KEPT"
        );

        /*
         * We don't know the user object if /auth/me
         * failed, so don't invent one.
         *
         * The saved token remains untouched.
         */
        setUser(null);
      } else {
        // ------------------------------------------------
        // 401
        //
        // Do NOT delete token automatically.
        // The API interceptor also keeps the token.
        // ------------------------------------------------

        console.log(
          "AUTH STARTUP: 401 RECEIVED"
        );

        console.log(
          "TOKEN NOT CLEARED"
        );

        setUser(null);
      }
    } finally {
      setIsLoading(false);

      console.log(
        "AUTH STARTUP CHECK COMPLETE"
      );
    }
  }, []);

  // ==================================================
  // STARTUP
  // ==================================================

  useEffect(() => {
    setUnauthorizedHandler(() => {
      console.log(
        "UNAUTHORIZED HANDLER CALLED"
      );

      /*
       * IMPORTANT:
       *
       * Never clear token here.
       *
       * Token is removed only by manual logout.
       */

      setUser(null);

      router.replace("/login");
    });

    refreshUser();
  }, [refreshUser]);

  // ==================================================
  // LOGIN
  // ==================================================

  const login = useCallback(
    async (
      username: string,
      password: string
    ) => {
      setLoginError(null);

      try {
        console.log(
          "================================"
        );

        console.log(
          "LOGIN START:",
          username
        );

        console.log(
          "================================"
        );

        const response =
          await api.post<{
            access_token?: string;
            token?: string;
            user: AuthUser;
          }>(
            "/auth/login",
            {
              username,
              password,
            }
          );

        console.log(
          "LOGIN API RESPONSE:",
          response.data
        );

        // ------------------------------------------------
        // Accept either token name
        // ------------------------------------------------

        const accessToken =
          response.data?.access_token ||
          response.data?.token;

        const loggedInUser =
          response.data?.user;

        // ------------------------------------------------
        // TOKEN CHECK
        // ------------------------------------------------

        if (!accessToken) {
          throw new Error(
            "Login succeeded but no token was returned."
          );
        }

        // ------------------------------------------------
        // USER CHECK
        // ------------------------------------------------

        if (!loggedInUser) {
          throw new Error(
            "Login succeeded but user information was not returned."
          );
        }

        // ------------------------------------------------
        // SAVE TOKEN
        // ------------------------------------------------

        await saveToken(
          accessToken
        );

        console.log(
          "TOKEN SAVED SUCCESSFULLY"
        );

        // ------------------------------------------------
        // SET USER
        // ------------------------------------------------

        setUser(
          loggedInUser
        );

        console.log(
          "USER SET:",
          loggedInUser
        );

        // ------------------------------------------------
        // GO DASHBOARD
        // ------------------------------------------------

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