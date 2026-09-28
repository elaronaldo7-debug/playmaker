import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants/theme";

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const TABS: Tab[] = [
  { key: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard" },
  { key: "players", label: "Players", icon: "people", route: "/players" },
  { key: "attendance", label: "Attendance", icon: "checkmark-circle", route: "/attendance" },
  { key: "fees", label: "Fees", icon: "cash", route: "/fees" },
  { key: "reports", label: "Reports", icon: "bar-chart", route: "/reports" },
  { key: "more", label: "More", icon: "ellipsis-horizontal-circle", route: "/more" },
];

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.route);
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={active ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  label: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  labelActive: { color: colors.primary, fontWeight: "700" },
});
