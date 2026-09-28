import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "@/constants/theme";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  width?: "half" | "full";
}

export default function StatCard({ label, value, icon, accentColor = colors.primary, width = "half" }: StatCardProps) {
  return (
    <View style={[styles.container, width === "full" && styles.full]}>
      <View style={[styles.iconWrap, { backgroundColor: accentColor + "22" }]}>
        <Ionicons name={icon} size={18} color={accentColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexBasis: "48%",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  full: { flexBasis: "100%" },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  value: { ...typography.h1, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
