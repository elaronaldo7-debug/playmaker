import { Linking, Alert } from "react-native";

/**
 * Reusable WhatsApp attendance export helper.
 *
 * Generates a Playmaker FC-formatted attendance summary message from the
 * SAME attendance data already loaded/saved on the Attendance screen, and
 * opens it in WhatsApp via a wa.me deep link.
 *
 * This module does not fetch or mutate any data itself — it is a pure
 * formatter + launcher, so it can be reused from any screen that has
 * attendance rows in this shape.
 */

export interface AttendanceExportPlayer {
  player_name: string;
  status: "PRESENT" | "ABSENT" | "UNMARKED";
}

export interface AttendanceExportParams {
  categoryName: string;
  date: string; // "YYYY-MM-DD", the exact date attendance was taken/saved for
  players: AttendanceExportPlayer[];
  academyName?: string;
  sessionLabel?: string;
}

/**
 * "2026-09-04" -> "Friday, 4 Sep"
 * Parsed as a local calendar date (not a UTC instant) so the weekday always
 * matches the date the coach actually selected, regardless of timezone.
 */
export function formatAttendanceDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const shortMonth = date.toLocaleDateString("en-US", { month: "short" });

  return `${weekday}, ${date.getDate()} ${shortMonth}`;
}

/**
 * Builds the exact WhatsApp message format used by Playmaker FC:
 *
 * ⚽ PLAYMAKER FC
 * U13 — Evening Session
 * Friday, 4 Sep
 * ────────────────
 * Present (4)
 * 1. AJAY KUMAR
 * ...
 *
 * Absent (7)
 * 5. CHRIS JONATHAN
 * ...
 * ────────────────
 * 4/11 present
 *
 * Unmarked players are excluded from both lists and from the total, per spec
 * — only players who were actually marked Present or Absent are counted.
 */
export function generateAttendanceWhatsAppMessage({
  categoryName,
  date,
  players,
  academyName = "PLAYMAKER FC",
  sessionLabel = "Evening Session",
}: AttendanceExportParams): string {
  const present = players.filter((p) => p.status === "PRESENT");
  const absent = players.filter((p) => p.status === "ABSENT");
  const totalMarked = present.length + absent.length;

  const divider = "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
  const dateLabel = formatAttendanceDateLabel(date);

  const lines: string[] = [];
  lines.push(`\u26BD ${academyName}`);
  lines.push(`${categoryName} \u2014 ${sessionLabel}`);
  lines.push(dateLabel);
  lines.push(divider);

  let counter = 1;

  lines.push(`Present (${present.length})`);
  present.forEach((p) => {
    lines.push(`${counter}. ${p.player_name.toUpperCase()}`);
    counter += 1;
  });

  lines.push("");
  lines.push(`Absent (${absent.length})`);
  absent.forEach((p) => {
    lines.push(`${counter}. ${p.player_name.toUpperCase()}`);
    counter += 1;
  });

  lines.push(divider);
  lines.push(`${present.length}/${totalMarked} present`);

  return lines.join("\n");
}

/**
 * Opens WhatsApp with the given message pre-filled, using the wa.me deep
 * link (no phone number = opens the chat picker so the coach can choose
 * where to send it, e.g. a team group).
 *
 * Falls back to a friendly alert if WhatsApp isn't installed / reachable,
 * instead of letting the app crash or silently doing nothing.
 */
export async function openWhatsAppWithMessage(message: string, phoneNumber?: string): Promise<void> {
  const encodedMessage = encodeURIComponent(message);
  const target = phoneNumber ? phoneNumber.replace(/[^0-9]/g, "") : "";
  const url = `https://wa.me/${target}?text=${encodedMessage}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(
        "WhatsApp not available",
        "WhatsApp doesn't seem to be installed on this device, so the attendance summary couldn't be sent."
      );
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Couldn't open WhatsApp",
      "Something went wrong while trying to open WhatsApp. Please try again."
    );
  }
}

/**
 * Convenience one-call helper: builds the message from attendance data and
 * immediately opens WhatsApp with it.
 */
export async function sendAttendanceToWhatsApp(
  params: AttendanceExportParams,
  phoneNumber?: string
): Promise<void> {
  const message = generateAttendanceWhatsAppMessage(params);
  await openWhatsAppWithMessage(message, phoneNumber);
}
