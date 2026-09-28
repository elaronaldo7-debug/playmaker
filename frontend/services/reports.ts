import api from "@/services/api";
import { AttendanceReport, FeesReport } from "@/types";

export interface AttendanceReportParams {
  category_id?: number;
  player_id?: number;
  date_from?: string;
  date_to?: string;
  month?: string; // YYYY-MM
}

export interface FeesReportParams {
  category_id?: number; // required for coaches
  month?: string;
  status?: "PAID" | "PENDING" | "PARTIAL";
}

/** Available to both Admin and Coach, for ALL categories. */
export async function getAttendanceReport(params: AttendanceReportParams = {}): Promise<AttendanceReport> {
  const { data } = await api.get<AttendanceReport>("/reports/attendance", { params });
  return data;
}

/** Coaches are restricted server-side to their assigned category_id. */
export async function getFeesReport(params: FeesReportParams): Promise<FeesReport> {
  const { data } = await api.get<FeesReport>("/reports/fees", { params });
  return data;
}
