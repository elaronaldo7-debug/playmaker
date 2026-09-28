import api from "@/services/api";
import { AttendanceForDateResponse, AttendanceRecord, AttendanceStatus } from "@/types";

export interface SaveAttendanceRecord {
  player_id: number;
  status: AttendanceStatus;
}

export interface SaveAttendanceInput {
  date: string; // YYYY-MM-DD
  category_id: number;
  records: SaveAttendanceRecord[];
}

/** GET /api/attendance?date=&category_id= */
export async function getAttendance(date: string, categoryId: number): Promise<AttendanceForDateResponse> {
  const { data } = await api.get<AttendanceForDateResponse>("/attendance", {
    params: { date, category_id: categoryId },
  });
  return data;
}

/** POST /api/attendance -- bulk upsert-style save, matches the "Save Attendance" button. */
export async function saveAttendance(
  input: SaveAttendanceInput
): Promise<{ message: string; records_saved: number }> {
  const { data } = await api.post<{ message: string; records_saved: number }>("/attendance", input);
  return data;
}

/** PUT /api/attendance/:id -- single-record correction. */
export async function updateAttendanceRecord(
  attendanceId: number,
  status: AttendanceStatus
): Promise<AttendanceRecord> {
  const { data } = await api.put<AttendanceRecord>(`/attendance/${attendanceId}`, { status });
  return data;
}
