import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import CategorySelector, { CategoryOption } from "@/components/CategorySelector";
import AttendanceRow, { AttendanceStatus } from "@/components/AttendanceRow";
import Button from "@/components/Button";
import Loading from "@/components/Loading";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { isAdmin as checkIsAdmin } from "@/utils/permissions";
import api, { apiErrorMessage } from "@/services/api";
import { colors, spacing, radius, typography } from "@/constants/theme";
import { sendAttendanceToWhatsApp, AttendanceExportPlayer } from "@/utils/whatsapp";

interface AttendancePlayerRow {
  player_id: number;
  player_name: string;
  profile_photo?: string | null;
  status: AttendanceStatus;
  attendance_id: number | null;
}

interface AttendanceCounts {
  present: number;
  absent: number;
  unmarked: number;
  total: number;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const admin = checkIsAdmin(user);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [rows, setRows] = useState<AttendancePlayerRow[]>([]);
  const [counts, setCounts] = useState<AttendanceCounts>({ present: 0, absent: 0, unmarked: 0, total: 0 });

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks whether the CURRENT on-screen attendance state has been saved to
  // the backend yet — the WhatsApp export button only appears after a
  // successful save, per spec, and hides again if the coach makes further
  // local changes without re-saving.
  const [justSaved, setJustSaved] = useState(false);
  const [sendingToWhatsApp, setSendingToWhatsApp] = useState(false);

  // ---- Load categories (coaches only see their own assigned category) ----
  useEffect(() => {
    (async () => {
      setLoadingCategories(true);
      try {
        if (admin) {
          const { data } = await api.get<{ id: number; name: string }[]>("/categories", {
            params: { active_only: true },
          });
          setCategories(data.map((c) => ({ id: c.id, name: c.name })));
          if (data.length > 0) setSelectedCategoryId(data[0].id);
        } else if (user?.coach?.category_id) {
          setCategories([{ id: user.coach.category_id, name: user.coach.category_name || "My Category" }]);
          setSelectedCategoryId(user.coach.category_id);
        } else {
          setCategories([]);
        }
      } catch (e) {
        setError(apiErrorMessage(e, "Could not load categories"));
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, [admin, user]);

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId)?.name ?? "",
    [categories, selectedCategoryId]
  );

  // ---- Load attendance for the selected date + category ----
  const loadAttendance = useCallback(async () => {
    if (!selectedCategoryId) return;
    setLoadingAttendance(true);
    setError(null);
    try {
      const { data } = await api.get("/attendance", {
        params: { date: toDateKey(selectedDate), category_id: selectedCategoryId },
      });
      setRows(data.players);
      setCounts(data.counts);
      setJustSaved(false);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load attendance"));
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedCategoryId, selectedDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // ---- Local status editing helpers (existing behaviour, unchanged) ----
  const recomputeCounts = (nextRows: AttendancePlayerRow[]): AttendanceCounts => {
    const present = nextRows.filter((r) => r.status === "PRESENT").length;
    const absent = nextRows.filter((r) => r.status === "ABSENT").length;
    const unmarked = nextRows.filter((r) => r.status === "UNMARKED").length;
    return { present, absent, unmarked, total: nextRows.length };
  };

  const setRowStatus = (playerId: number, status: AttendanceStatus) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.player_id === playerId ? { ...r, status } : r));
      setCounts(recomputeCounts(next));
      return next;
    });
    setJustSaved(false);
  };

  const markAllPresent = () => {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r, status: "PRESENT" as AttendanceStatus }));
      setCounts(recomputeCounts(next));
      return next;
    });
    setJustSaved(false);
  };

  const markAllAbsent = () => {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r, status: "ABSENT" as AttendanceStatus }));
      setCounts(recomputeCounts(next));
      return next;
    });
    setJustSaved(false);
  };

  const resetAll = () => {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r, status: "UNMARKED" as AttendanceStatus }));
      setCounts(recomputeCounts(next));
      return next;
    });
    setJustSaved(false);
  };

  // ---- Save attendance (existing behaviour, unchanged) ----
  const saveAttendance = async () => {
    if (!selectedCategoryId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/attendance", {
        date: toDateKey(selectedDate),
        category_id: selectedCategoryId,
        records: rows.map((r) => ({ player_id: r.player_id, status: r.status })),
      });
      setJustSaved(true);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not save attendance"));
      setJustSaved(false);
    } finally {
      setSaving(false);
    }
  };

  // ---- WhatsApp export: reuses the exact rows/date/category already on screen ----
  const handleSendToWhatsApp = async () => {
    setSendingToWhatsApp(true);
    try {
      const exportPlayers: AttendanceExportPlayer[] = rows.map((r) => ({
        player_name: r.player_name,
        status: r.status,
      }));
      await sendAttendanceToWhatsApp({
        categoryName: selectedCategoryName,
        date: toDateKey(selectedDate),
        players: exportPlayers,
      });
    } finally {
      setSendingToWhatsApp(false);
    }
  };

  const changeDay = (deltaDays: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + deltaDays);
      return next;
    });
  };

  const isToday = toDateKey(selectedDate) === toDateKey(new Date());

  return (
    <ScreenContainer scroll={false}>
      <Header title="Attendance" subtitle={selectedCategoryName || undefined} />

      {/* Date selector */}
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDay(-1)} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.dateLabelWrap}>
          <Text style={styles.dateLabel}>{formatDisplayDate(selectedDate)}</Text>
          {!isToday && (
            <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
              <Text style={styles.todayLink}>Jump to today</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDay(1)} hitSlop={10}>
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Category selector (admin: all categories; coach: their own only) */}
      {categories.length > 0 && (
        <View style={styles.categoryWrap}>
          <CategorySelector
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={(id) => {
              setSelectedCategoryId(id);
              setJustSaved(false);
            }}
          />
        </View>
      )}

      {/* Counters */}
      <View style={styles.countersRow}>
        <CounterPill label="Present" value={counts.present} color={colors.present} />
        <CounterPill label="Absent" value={counts.absent} color={colors.absent} />
        <CounterPill label="Unmarked" value={counts.unmarked} color={colors.unmarked} />
        <CounterPill label="Total" value={counts.total} color={colors.textSecondary} />
      </View>

      {/* Quick actions */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={styles.quickActionBtn} onPress={markAllPresent}>
          <Text style={[styles.quickActionText, { color: colors.present }]}>All Present</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBtn} onPress={markAllAbsent}>
          <Text style={[styles.quickActionText, { color: colors.absent }]}>All Absent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBtn} onPress={resetAll}>
          <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Player list */}
      {loadingCategories || loadingAttendance ? (
        <Loading label="Loading attendance..." />
      ) : rows.length === 0 ? (
        <EmptyState icon="people-outline" title="No active players" message="This category has no active players yet." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.player_id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AttendanceRow
              playerName={item.player_name}
              profilePhoto={item.profile_photo}
              status={item.status}
              onMarkPresent={() => setRowStatus(item.player_id, "PRESENT")}
              onMarkAbsent={() => setRowStatus(item.player_id, "ABSENT")}
            />
          )}
        />
      )}

      {/* Save + WhatsApp export */}
      <View style={styles.footer}>
        <Button label="Save Attendance" onPress={saveAttendance} loading={saving} disabled={rows.length === 0} />

        {justSaved && (
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={handleSendToWhatsApp}
            activeOpacity={0.8}
            disabled={sendingToWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={18} color={colors.white} />
            <Text style={styles.whatsappBtnText}>
              {sendingToWhatsApp ? "Opening WhatsApp..." : "Send Attendance to WhatsApp"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenContainer>
  );
}

function CounterPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.counterPill}>
      <Text style={[styles.counterValue, { color }]}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  dateArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  dateLabelWrap: { alignItems: "center" },
  dateLabel: { ...typography.h3, color: colors.textPrimary },
  todayLink: { ...typography.caption, color: colors.primary, marginTop: 2 },
  categoryWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  countersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  counterPill: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  counterValue: { ...typography.h3 },
  counterLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  quickActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  quickActionText: { ...typography.captionBold },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  errorBox: {
    backgroundColor: colors.absentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.body, color: colors.absent },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#1F8A47",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  whatsappBtnText: { ...typography.bodyBold, color: colors.white },
});
