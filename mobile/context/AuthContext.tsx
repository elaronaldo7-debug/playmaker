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
  clearAuthData,
  saveUser,
  getSavedUser,
  setUnauthorizedHandler,
  apiErrorMessage,
} from "@/services/api";

// ==================================================
// TYPES
// ==================================================

export type Role =
  | "ADMIN"
  | "COACH";

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
  createContext<
    AuthContextValue | undefined
  >(undefined);

// ==================================================
// PROVIDER
// ==================================================

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [loginError, setLoginError] =
    useState<string | null>(
      null
    );

  // ==================================================
  // LOGOUT
  // ==================================================

  const logout =
    useCallback(async () => {
      console.log(
        "================================"
      );

      console.log(
        "MANUAL LOGOUT"
      );

      console.log(
        "================================"
      );

      try {
        await api.post(
          "/auth/logout"
        );
      } catch {
        // Ignore server logout errors.
      }

      /*
       * IMPORTANT:
       *
       * Only manual logout clears
       * both token and saved user.
       */

      await clearAuthData();

      setUser(null);
      setLoginError(null);

      router.replace(
        "/login"
      );
    }, []);

  // ==================================================
  // REFRESH USER
  // ==================================================

  const refreshUser =
    useCallback(async () => {
      console.log(
        "================================"
      );

      console.log(
        "AUTH STARTUP CHECK"
      );

      console.log(
        "================================"
      );

      const token =
        await getToken();

      // ------------------------------------------------
      // NO TOKEN
      // ------------------------------------------------

      if (!token) {
        console.log(
          "NO TOKEN FOUND"
        );

        setUser(null);
        setIsLoading(false);

        return;
      }

      console.log(
        "TOKEN FOUND"
      );

      // ------------------------------------------------
      // LOAD SAVED USER FIRST
      // ------------------------------------------------

      const savedUser =
        await getSavedUser<AuthUser>();

      if (savedUser) {
        console.log(
          "SAVED USER FOUND"
        );

        /*
         * This is the important part.
         *
         * Dashboard can open immediately
         * even if Render/API is temporarily
         * slow or unavailable.
         */

        setUser(
          savedUser
        );
      } else {
        console.log(
          "NO SAVED USER FOUND"
        );
      }

      // ------------------------------------------------
      // TRY SERVER REFRESH
      // ------------------------------------------------

      try {
        console.log(
          "CHECKING /auth/me"
        );

        const response =
          await api.get<AuthUser>(
            "/auth/me"
          );

        console.log(
          "/auth/me SUCCESS"
        );

        console.log(
          "LATEST USER:",
          response.data
        );

        /*
         * Update local user with
         * latest server information.
         */

        setUser(
          response.data
        );

        /*
         * Save latest user again.
         */

        await saveUser(
          response.data
        );
      } catch (error: any) {
        console.log(
          "AUTH /auth/me ERROR:",
          error
        );

        console.log(
          "STATUS:",
          error?.response?.status
        );

        /*
         * IMPORTANT:
         *
         * NEVER remove saved user here.
         *
         * NEVER remove token here.
         *
         * The cached session remains active.
         */

        if (savedUser) {
          console.log(
            "USING SAVED USER"
          );

          setUser(
            savedUser
          );
        } else {
          console.log(
            "NO SAVED USER AVAILABLE"
          );

          /*
           * Only if there is a token but
           * somehow no cached user, we cannot
           * safely construct a user object.
           */
          setUser(null);
        }
      } finally {
        setIsLoading(false);

        console.log(
          "AUTH STARTUP COMPLETE"
        );

        console.log(
          "================================"
        );
      }
    }, []);

  // ==================================================
  // STARTUP
  // ==================================================

  useEffect(() => {
    /*
     * IMPORTANT:
     *
     * 401 should NOT automatically
     * send the user to login.
     *
     * We keep the saved session.
     */

    setUnauthorizedHandler(
      () => {
        console.log(
          "401 HANDLER"
        );

        console.log(
          "KEEPING SESSION"
        );

        /*
         * Do NOT:
         *
         * setUser(null)
         * clearToken()
         * clearAuthData()
         * router.replace("/login")
         *
         * here.
         */
      }
    );

    refreshUser();

    /*
     * Cleanup handler when provider
     * is unmounted.
     */

    return () => {
      setUnauthorizedHandler(
        null
      );
    };
  }, [refreshUser]);

  // ==================================================
  // LOGIN
  // ==================================================

  const login =
    useCallback(
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
          // GET TOKEN
          // ------------------------------------------------

          const accessToken =
            response.data
              ?.access_token ||
            response.data
              ?.token;

          // ------------------------------------------------
          // GET USER
          // ------------------------------------------------

          const loggedInUser =
            response.data?.user;

          // ------------------------------------------------
          // TOKEN VALIDATION
          // ------------------------------------------------

          if (!accessToken) {
            throw new Error(
              "Login succeeded but no token was returned."
            );
          }

          // ------------------------------------------------
          // USER VALIDATION
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
            "TOKEN SAVED"
          );

          // ------------------------------------------------
          // SAVE USER
          // ------------------------------------------------

          await saveUser(
            loggedInUser
          );

          console.log(
            "USER SAVED"
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
          // DASHBOARD
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

  const value:
    AuthContextValue = {
    user,
    isLoading,
    isAuthenticated:
      !!user,

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

export function useAuth():
  AuthContextValue {
  const ctx =
    useContext(
      AuthContext
    );

  if (!ctx) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return ctx;
}