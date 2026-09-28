import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, radius, typography, feeStatusColor } from "@/constants/theme";

export interface FeeSummary {
  id: number;
  month: string;
  fee_amount: number;
  paid_amount: number;
  balance: number;
  status: "PAID" | "PENDING" | "PARTIAL";
  player_name?: string | null;
}

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function FeeCard({ fee, onPress }: { fee: FeeSummary; onPress?: () => void }) {
  const color = feeStatusColor(fee.status);
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75} disabled={!onPress}>
      <View style={styles.topRow}>
        <View>
          {fee.player_name ? <Text style={styles.playerName}>{fee.player_name}</Text> : null}
          <Text style={styles.month}>{formatMonth(fee.month)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color + "22" }]}>
          <Text style={[styles.badgeText, { color }]}>{fee.status}</Text>
        </View>
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Fee</Text>
          <Text style={styles.amountValue}>₹{fee.fee_amount.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, { color: colors.present }]}>
            ₹{fee.paid_amount.toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, { color: fee.balance > 0 ? colors.absent : colors.textSecondary }]}>
            ₹{fee.balance.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  playerName: { ...typography.bodyBold, color: colors.textPrimary },
  month: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { ...typography.captionBold, fontSize: 10 },
  amountsRow: { flexDirection: "row", marginTop: spacing.md, gap: spacing.lg },
  amountBlock: {},
  amountLabel: { ...typography.caption, color: colors.textMuted },
  amountValue: { ...typography.bodyBold, color: colors.textPrimary, marginTop: 2 },
});
