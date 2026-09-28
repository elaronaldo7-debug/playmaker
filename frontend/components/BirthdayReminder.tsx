import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, typography } from "@/constants/theme";

export interface BirthdayReminderItem {
  player_id: number;
  player_name: string;
  category_name?: string | null;
  is_today: boolean;
  message: string;
}

export default function BirthdayReminder({ reminders }: { reminders: BirthdayReminderItem[] }) {
  if (!reminders || reminders.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{"\uD83C\uDF82"} Birthday Reminder</Text>
      {reminders.map((r) => (
        <View key={r.player_id} style={styles.row}>
          <Text style={styles.emoji}>{r.is_today ? "\uD83C\uDF89" : "\uD83C\uDF82"}</Text>
          <View style={styles.textCol}>
            <Text style={styles.name}>
              {r.is_today ? `Happy Birthday ${r.player_name}!` : r.player_name}
            </Text>
            <Text style={styles.meta}>
              {r.is_today ? "Today" : "Tomorrow"}
              {r.category_name ? ` \u2022 ${r.category_name}` : ""}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: { ...typography.bodyBold, color: colors.textPrimary, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs, gap: spacing.sm },
  emoji: { fontSize: 20 },
  textCol: { flex: 1 },
  name: { ...typography.body, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
});
