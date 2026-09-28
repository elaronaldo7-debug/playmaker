import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import BirthdayReminder, { BirthdayReminderItem } from "@/components/BirthdayReminder";
import Loading from "@/components/Loading";
import { useAuth } from "@/context/AuthContext";
import api, { apiErrorMessage } from "@/services/api";
import { colors, spacing, radius, typography } from "@/constants/theme";

interface AdminDashboardData {
  role: "ADMIN";
  total_players: number;
  active_players: number;
  inactive_players: number;
  today_present: number;
  today_absent: number;
  this_month_fees_collected: number;
  pending_fees: number;
  category_summary: { category_id: number; category_name: string; active_players: number }[];
  birthday_reminders: BirthdayReminderItem[];
}

interface CoachDashboardData {
  role: "COACH";
  category_id?: number;
  category_name?: string;
  assigned_category_player_count?: number;
  active_players?: number;
  today_present?: number;
  today_absent?: number;
  birthday_reminders: BirthdayReminderItem[];
  error?: string;
}

type DashboardData = AdminDashboardData | CoachDashboardData;

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<DashboardData>("/dashboard");
      setData(data);
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load dashboard"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) return <Loading label="Loading dashboard..." />;

  const isAdmin = data?.role === "ADMIN";

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      <Header
        title="Playmaker FC"
        subtitle={user ? `${user.role === "ADMIN" ? "Admin" : "Coach"} · ${user.username}` : ""}
        rightIcon="log-out-outline"
        onRightPress={logout}
      />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {data?.birthday_reminders && data.birthday_reminders.length > 0 && (
        <BirthdayReminder reminders={data.birthday_reminders} />
      )}

      {data?.role === "COACH" && data.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{data.error}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        {isAdmin ? (
          <>
            <StatCard label="Total Players" value={(data as AdminDashboardData).total_players} icon="people" />
            <StatCard
              label="Active Players"
              value={(data as AdminDashboardData).active_players}
              icon="checkmark-circle"
              accentColor={colors.present}
            />
            <StatCard
              label="Today Present"
              value={(data as AdminDashboardData).today_present}
              icon="checkmark-done"
              accentColor={colors.present}
            />
            <StatCard
              label="Today Absent"
              value={(data as AdminDashboardData).today_absent}
              icon="close-circle"
              accentColor={colors.absent}
            />
            <StatCard
              label="Fees Collected (Month)"
              value={`₹${(data as AdminDashboardData).this_month_fees_collected.toLocaleString("en-IN")}`}
              icon="cash"
              accentColor={colors.present}
              width="full"
            />
            <StatCard
              label="Pending Fees"
              value={`₹${(data as AdminDashboardData).pending_fees.toLocaleString("en-IN")}`}
              icon="alert-circle"
              accentColor={colors.absent}
              width="full"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Active Players"
              value={(data as CoachDashboardData).active_players ?? 0}
              icon="people"
            />
            <StatCard
              label="My Category"
              value={(data as CoachDashboardData).category_name ?? "-"}
              icon="ribbon"
            />
            <StatCard
              label="Today Present"
              value={(data as CoachDashboardData).today_present ?? 0}
              icon="checkmark-done"
              accentColor={colors.present}
            />
            <StatCard
              label="Today Absent"
              value={(data as CoachDashboardData).today_absent ?? 0}
              icon="close-circle"
              accentColor={colors.absent}
            />
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/attendance")}>
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.quickActionLabel}>Take Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/players")}>
          <Ionicons name="search-outline" size={22} color={colors.primary} />
          <Text style={styles.quickActionLabel}>Find Player</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/fees")}>
            <Ionicons name="cash-outline" size={22} color={colors.primary} />
            <Text style={styles.quickActionLabel}>Manage Fees</Text>
          </TouchableOpacity>
        )}
      </View>

      {isAdmin && (data as AdminDashboardData).category_summary?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Category Summary</Text>
          <View style={styles.categoryList}>
            {(data as AdminDashboardData).category_summary.map((c) => (
              <View key={c.category_id} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{c.category_name}</Text>
                <Text style={styles.categoryCount}>{c.active_players} players</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  quickActions: { flexDirection: "row", gap: spacing.sm },
  quickAction: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  quickActionLabel: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  errorBox: {
    backgroundColor: colors.absentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.body, color: colors.absent },
  categoryList: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  categoryName: { ...typography.body, color: colors.textPrimary },
  categoryCount: { ...typography.caption, color: colors.textSecondary },
});
