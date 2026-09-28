import axios, { AxiosError, AxiosInstance } from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) || "http://localhost:5000/api";

export const TOKEN_KEY = "playmaker_fc_token";

let onUnauthorized: (() => void) | null = null;

/** Called once from AuthContext so the api layer can trigger logout on 401. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * The Flask backend wraps every /api/* response in a standard envelope:
 *   success -> { "success": true,  "data": <payload> }
 *   error   -> { "success": false, "message": "<text>" }
 *
 * This interceptor unwraps the "data" field transparently, so every
 * existing call site in the app (e.g. `const { data } = await api.get(...)`)
 * keeps receiving exactly the inner payload it always did, with zero
 * changes required anywhere else in the mobile project.
 */
interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

function isEnvelope(body: unknown): body is Envelope<unknown> {
  return !!body && typeof body === "object" && "success" in (body as Record<string, unknown>);
}

api.interceptors.response.use(
  (response) => {
    if (isEnvelope(response.data) && response.data.success) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await clearToken();
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || error.message || fallback;
  }
  return fallback;
}

export default api;
