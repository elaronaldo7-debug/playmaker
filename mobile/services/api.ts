import axios, { AxiosError, AxiosInstance } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  "http://localhost:5000/api";

console.log("================================");
console.log("PLAYMAKER API URL:", API_BASE_URL);
console.log("================================");

export const TOKEN_KEY = "playmaker_fc_token";
export const USER_KEY = "playmaker_fc_user";

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(
  handler: (() => void) | null
) {
  onUnauthorized = handler;
}

// ==================================================
// SAVE TOKEN
// ==================================================

export async function saveToken(token: string) {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(TOKEN_KEY, token);

      console.log("TOKEN SAVED - WEB");

      return;
    }

    await SecureStore.setItemAsync(
      TOKEN_KEY,
      token
    );

    console.log(
      "TOKEN SAVED - SECURE STORE"
    );
  } catch (error) {
    console.error(
      "SAVE TOKEN ERROR:",
      error
    );

    throw error;
  }
}

// ==================================================
// GET TOKEN
// ==================================================

export async function getToken(): Promise<string | null> {
  try {
    let token: string | null = null;

    if (Platform.OS === "web") {
      token =
        localStorage.getItem(TOKEN_KEY);
    } else {
      token =
        await SecureStore.getItemAsync(
          TOKEN_KEY
        );
    }

    console.log(
      "GET TOKEN:",
      token ? "FOUND" : "NOT FOUND"
    );

    return token;
  } catch (error) {
    console.error(
      "GET TOKEN ERROR:",
      error
    );

    return null;
  }
}

// ==================================================
// SAVE USER
// ==================================================

export async function saveUser(
  user: unknown
) {
  try {
    const value =
      JSON.stringify(user);

    if (Platform.OS === "web") {
      localStorage.setItem(
        USER_KEY,
        value
      );

      console.log(
        "USER SAVED - WEB"
      );

      return;
    }

    await SecureStore.setItemAsync(
      USER_KEY,
      value
    );

    console.log(
      "USER SAVED - SECURE STORE"
    );
  } catch (error) {
    console.error(
      "SAVE USER ERROR:",
      error
    );

    throw error;
  }
}

// ==================================================
// GET USER
// ==================================================

export async function getSavedUser<T>(): Promise<T | null> {
  try {
    let value: string | null = null;

    if (Platform.OS === "web") {
      value =
        localStorage.getItem(USER_KEY);
    } else {
      value =
        await SecureStore.getItemAsync(
          USER_KEY
        );
    }

    if (!value) {
      console.log(
        "GET SAVED USER: NOT FOUND"
      );

      return null;
    }

    const user =
      JSON.parse(value) as T;

    console.log(
      "GET SAVED USER: FOUND"
    );

    return user;
  } catch (error) {
    console.error(
      "GET SAVED USER ERROR:",
      error
    );

    return null;
  }
}

// ==================================================
// CLEAR TOKEN
// ==================================================

export async function clearToken() {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(
        TOKEN_KEY
      );

      console.log(
        "TOKEN CLEARED - WEB"
      );

      return;
    }

    await SecureStore.deleteItemAsync(
      TOKEN_KEY
    );

    console.log(
      "TOKEN CLEARED - SECURE STORE"
    );
  } catch (error) {
    console.error(
      "CLEAR TOKEN ERROR:",
      error
    );
  }
}

// ==================================================
// CLEAR USER
// ==================================================

export async function clearSavedUser() {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(
        USER_KEY
      );

      console.log(
        "USER CLEARED - WEB"
      );

      return;
    }

    await SecureStore.deleteItemAsync(
      USER_KEY
    );

    console.log(
      "USER CLEARED - SECURE STORE"
    );
  } catch (error) {
    console.error(
      "CLEAR USER ERROR:",
      error
    );
  }
}

// ==================================================
// CLEAR AUTH DATA
// ==================================================

export async function clearAuthData() {
  await clearToken();
  await clearSavedUser();
}

// ==================================================
// AXIOS INSTANCE
// ==================================================

export const api: AxiosInstance =
  axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
  });

// ==================================================
// REQUEST INTERCEPTOR
// ==================================================

api.interceptors.request.use(
  async (config) => {
    const token =
      await getToken();

    console.log(
      "--------------------------------"
    );

    console.log(
      "API REQUEST:",
      config.method?.toUpperCase(),
      `${config.baseURL}${config.url}`
    );

    console.log(
      "TOKEN EXISTS:",
      !!token
    );

    if (token) {
      config.headers =
        config.headers ?? {};

      if (
        typeof config.headers.set ===
        "function"
      ) {
        config.headers.set(
          "Authorization",
          `Bearer ${token}`
        );
      } else {
        config.headers.Authorization =
          `Bearer ${token}`;
      }

      console.log(
        "AUTHORIZATION HEADER: ATTACHED"
      );
    } else {
      console.log(
        "AUTHORIZATION HEADER: NOT ATTACHED"
      );
    }

    console.log(
      "--------------------------------"
    );

    return config;
  },
  (error) => {
    console.error(
      "REQUEST INTERCEPTOR ERROR:",
      error
    );

    return Promise.reject(error);
  }
);

// ==================================================
// API RESPONSE ENVELOPE
// ==================================================

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

function isEnvelope(
  body: unknown
): body is Envelope<unknown> {
  return (
    !!body &&
    typeof body === "object" &&
    "success" in
      (body as Record<string, unknown>)
  );
}

// ==================================================
// RESPONSE INTERCEPTOR
// ==================================================

api.interceptors.response.use(
  (response) => {
    console.log(
      "================================"
    );

    console.log(
      "API RESPONSE:",
      response.status
    );

    console.log(
      "API URL:",
      response.config.url
    );

    console.log(
      "API DATA:",
      response.data
    );

    console.log(
      "================================"
    );

    if (
      isEnvelope(response.data) &&
      response.data.success
    ) {
      response.data =
        response.data.data;
    }

    return response;
  },

  async (error: AxiosError) => {
    console.log(
      "================================"
    );

    console.log(
      "API ERROR:",
      error.message
    );

    console.log(
      "STATUS:",
      error.response?.status
    );

    console.log(
      "URL:",
      error.config?.url
    );

    console.log(
      "ERROR DATA:",
      error.response?.data
    );

    console.log(
      "================================"
    );

    // IMPORTANT:
    // Never automatically logout.
    //
    // The saved token and saved user
    // remain available until manual logout.

    if (
      error.response?.status === 401
    ) {
      console.log(
        "401 RECEIVED"
      );

      console.log(
        "SESSION WILL NOT BE CLEARED"
      );

      /*
       * Do NOT automatically navigate
       * to the login screen.
       *
       * User requested:
       *
       * Login once -> stay logged in
       * until manual logout.
       */

      if (onUnauthorized) {
        onUnauthorized();
      }
    }

    return Promise.reject(error);
  }
);

// ==================================================
// API ERROR MESSAGE
// ==================================================

export function apiErrorMessage(
  error: unknown,
  fallback = "Something went wrong"
): string {
  if (
    axios.isAxiosError(error)
  ) {
    const data =
      error.response?.data as
        | {
            message?: string;
            error?: string;
          }
        | undefined;

    return (
      data?.message ||
      data?.error ||
      error.message ||
      fallback
    );
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return fallback;
}

export default api;