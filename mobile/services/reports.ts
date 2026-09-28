import api from "@/services/api";
import {
  AttendanceReport,
  FeesReport,
} from "@/types";

export interface AttendanceReportParams {
  category_id?: number;
  player_id?: number;
  date_from?: string;
  date_to?: string;
  month?: string;
}

export interface FeesReportParams {
  category_id?: number;
  month?: string;
  status?: "PAID" | "PENDING" | "PARTIAL";
}

export async function getAttendanceReport(
  params: AttendanceReportParams = {}
): Promise<AttendanceReport> {
  const { data } =
    await api.get<AttendanceReport>(
      "/reports/attendance",
      { params }
    );

  return data;
}

export async function getFeesReport(
  params: FeesReportParams
): Promise<FeesReport> {
  const { data } =
    await api.get<FeesReport>(
      "/reports/fees",
      { params }
    );

  return data;
}