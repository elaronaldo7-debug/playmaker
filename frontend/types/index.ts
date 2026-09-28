/**
 * Shared types mirroring the Flask backend's model.to_dict() shapes.
 * Kept in one place so services/*.ts and screens can import consistent
 * types instead of redefining ad-hoc interfaces per file.
 */

// Auth-related types already live in context/AuthContext.tsx (the original
// source of truth, used throughout the app) -- re-exported here so screens
// can pull every type from "@/types" without caring which file originally
// defined it, instead of duplicating (and risking drift from) that shape.
export type { Role, CoachInfo, AuthUser } from "@/context/AuthContext";

export type PlayerStatus = "ACTIVE" | "INACTIVE";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "UNMARKED";
export type FeeStatus = "PAID" | "PENDING" | "PARTIAL";
export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER";

export interface Category {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Coach {
  id: number;
  user_id: number;
  username: string | null;
  coach_name: string;
  category_id: number | null;
  category_name: string | null;
  is_active: boolean | null;
}

export interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  attendance_percentage: number;
}

export interface Player {
  id: number;
  player_id: string;
  player_name: string;
  profile_photo: string | null;
  date_of_birth: string;
  age: number;
  school: string | null;
  standard: string | null;
  phone_1: string | null;
  phone_2: string | null;
  pickup_person: string | null;
  health_condition: string | null;
  status: PlayerStatus;
  category_id: number;
  category_name: string | null;
  attendance_summary?: AttendanceSummary;
  fees?: Fee[];
  attendance_history?: AttendanceRecord[];
}

export interface PlayersListResponse {
  players: Player[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface AttendanceRecord {
  id: number;
  player_id: number;
  player_name: string | null;
  date: string;
  status: AttendanceStatus;
  marked_by: number | null;
}

export interface AttendancePlayerRow {
  player_id: number;
  player_name: string;
  profile_photo: string | null;
  status: AttendanceStatus;
  attendance_id: number | null;
}

export interface AttendanceCounts {
  present: number;
  absent: number;
  unmarked: number;
  total: number;
}

export interface AttendanceForDateResponse {
  date: string;
  category_id: number;
  players: AttendancePlayerRow[];
  counts: AttendanceCounts;
}

export interface FeePayment {
  id: number;
  fee_id: number;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  recorded_by: number | null;
  recorded_by_username: string | null;
}

export interface Fee {
  id: number;
  player_id: number;
  player_name: string | null;
  category_id?: number;
  fee_amount: number;
  paid_amount: number;
  balance: number;
  status: FeeStatus;
  month: string; // YYYY-MM
  payments?: FeePayment[];
}

export interface AdminDashboard {
  role: "ADMIN";
  total_players: number;
  active_players: number;
  inactive_players: number;
  today_present: number;
  today_absent: number;
  this_month_fees_collected: number;
  pending_fees: number;
  category_summary: { category_id: number; category_name: string; active_players: number }[];
  birthday_reminders: BirthdayReminder[];
}

export interface CoachDashboard {
  role: "COACH";
  category_id?: number;
  category_name?: string;
  assigned_category_player_count?: number;
  active_players?: number;
  today_present?: number;
  today_absent?: number;
  birthday_reminders: BirthdayReminder[];
  error?: string;
}

export type Dashboard = AdminDashboard | CoachDashboard;

export interface BirthdayReminder {
  player_id: number;
  player_name: string;
  category_name: string | null;
  is_today: boolean;
  message: string;
}

export interface AttendanceReport {
  records: AttendanceRecord[];
  summary: { present: number; absent: number; total: number };
}

export interface FeesReport {
  records: Fee[];
  summary: { total_collected: number; total_pending: number; count: number };
}
