import { AuthUser } from "@/context/AuthContext";

/**
 * These helpers only control what the UI SHOWS or ENABLES for convenience
 * and a good UX. They are NOT the security boundary — the Flask backend
 * re-checks every one of these rules on every request (see
 * backend/app/utils/permissions.py). Never rely on these alone.
 */

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "ADMIN";
}

export function isCoach(user: AuthUser | null): boolean {
  return user?.role === "COACH";
}

export function assignedCategoryId(user: AuthUser | null): number | null {
  if (!user || user.role !== "COACH") return null;
  return user.coach?.category_id ?? null;
}

export function canManageCategories(user: AuthUser | null): boolean {
  return isAdmin(user);
}

export function canManageCoaches(user: AuthUser | null): boolean {
  return isAdmin(user);
}

export function canEditPlayers(user: AuthUser | null): boolean {
  return isAdmin(user);
}

export function canWriteAttendanceFor(user: AuthUser | null, categoryId: number): boolean {
  if (isAdmin(user)) return true;
  return assignedCategoryId(user) === categoryId;
}

export function canWriteFeesFor(user: AuthUser | null, categoryId: number): boolean {
  return canWriteAttendanceFor(user, categoryId);
}

export function canViewFeesFor(user: AuthUser | null, categoryId: number): boolean {
  if (isAdmin(user)) return true;
  return assignedCategoryId(user) === categoryId;
}

export function canViewDashboardFinancials(user: AuthUser | null): boolean {
  return isAdmin(user);
}
