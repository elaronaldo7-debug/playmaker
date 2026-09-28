import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { isAdmin as checkIsAdmin } from "@/utils/permissions";

import {
  colors,
  spacing,
  radius,
  typography,
} from "@/constants/theme";

interface MoreItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function MoreItem({
  icon,
  title,
  subtitle,
  onPress,
}: MoreItemProps) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.iconBox}>
        <Ionicons
          name={icon}
          size={23}
          color={colors.primary}
        />
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>
          {title}
        </Text>

        <Text style={styles.itemSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const admin = checkIsAdmin(user);

  return (
    <ScreenContainer
      contentContainerStyle={styles.container}
    >
      <Header
        title="More"
        subtitle="Management & Tools"
      />

      {/* =====================================================
          REPORTS
      ====================================================== */}

      <Text style={styles.sectionTitle}>
        Reports
      </Text>

      <View style={styles.card}>
        <MoreItem
          icon="bar-chart-outline"
          title="Reports"
          subtitle="Attendance and fees reports"
          onPress={() =>
            router.push("/more/reports")
          }
        />
      </View>

      {/* =====================================================
          MANAGEMENT
      ====================================================== */}

      <Text style={styles.sectionTitle}>
        Management
      </Text>

      <View style={styles.card}>

        {/* -------------------------------------------------
            COACHES
            Admin only
        -------------------------------------------------- */}

        {admin && (
          <>
            <MoreItem
              icon="people-outline"
              title="Coaches"
              subtitle="Manage academy coaches"
              onPress={() =>
                router.push("/coaches")
              }
            />

            <View style={styles.divider} />
          </>
        )}

        {/* -------------------------------------------------
            SETTINGS
            Admin + Coach
        -------------------------------------------------- */}

        <MoreItem
          icon="settings-outline"
          title="Settings"
          subtitle="Academy and application settings"
          onPress={() =>
            router.push("/settings")
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl * 2,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },

  item: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: 72,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },

  itemContent: {
    flex: 1,
  },

  itemTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },

  itemSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },
});