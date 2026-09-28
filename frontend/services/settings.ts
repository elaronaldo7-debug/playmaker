import api from "@/services/api";
import { AuthUser } from "@/types";

/** GET /api/auth/me -- current user profile, used by the Settings screen. */
export async function getProfile(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

/**
 * PUT /api/auth/change-password -- self-service change, works identically
 * for Admin and Coach (each changes their own password here).
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const { data } = await api.put<{ message: string }>("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}

// Category management (Admin Settings -> Category management) lives in
// services/categories.ts to avoid duplicating the same endpoints in two
// places; re-exported here so Settings screens can import everything they
// need from one module if that's more convenient.
export { listCategories, createCategory, updateCategory, deleteCategory } from "@/services/categories";
