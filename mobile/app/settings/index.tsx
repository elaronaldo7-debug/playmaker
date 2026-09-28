import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing, typography } from "@/constants/theme";

type SettingItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.iconBox}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>

      <View style={styles.settingTextWrap}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={styles.sectionTitle}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin =
    String(user?.role || "").toUpperCase() === "ADMIN";

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleProfile = () => {
    router.push("/settings/profile");
  };

  const handleAcademyInfo = () => {
    router.push("/settings/academy");
  };

  const handleBackup = () => {
    router.push("/settings/backup");
  };

  const handleNotifications = () => {
    router.push("/settings/notifications");
  };

  const handleAbout = () => {
    router.push("/settings/about");
  };

  const handleCoaches = () => {
    router.push("/coaches" as any);
  };

  const handleCategories = () => {
    router.push("/settings/categories");
  };

  return (
    <ScreenContainer scroll={false}>
      <Header
        title="Settings"
        subtitle="Manage your academy app"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* ======================================================
            ACCOUNT
        ====================================================== */}

        <SectionTitle title="Account" />

        <View style={styles.card}>
          <SettingItem
            icon="person-outline"
            title="Profile"
            subtitle="View and manage your account"
            onPress={handleProfile}
          />
        </View>

        {/* ======================================================
            ACADEMY
            ADMIN ONLY
        ====================================================== */}

        {isAdmin && (
          <>
            <SectionTitle title="Academy" />

            <View style={styles.card}>
              <SettingItem
                icon="football-outline"
                title="Academy Information"
                subtitle="Academy name, logo and details"
                onPress={handleAcademyInfo}
              />
            </View>
          </>
        )}

        {/* ======================================================
            ADMINISTRATION
            ADMIN ONLY
        ====================================================== */}

        {isAdmin && (
          <>
            <SectionTitle title="Administration" />

            <View style={styles.card}>

              <SettingItem
                icon="people-outline"
                title="Coaches"
                subtitle="Manage academy coaches"
                onPress={handleCoaches}
              />

              <View style={styles.divider} />

              <SettingItem
                icon="layers-outline"
                title="Categories"
                subtitle="Manage player categories"
                onPress={handleCategories}
              />

              <View style={styles.divider} />

              <SettingItem
                icon="cloud-upload-outline"
                title="Backup & Export"
                subtitle="Backup academy data and export reports"
                onPress={handleBackup}
              />

            </View>
          </>
        )}

        {/* ======================================================
            APP
            ADMIN + COACH
        ====================================================== */}

        <SectionTitle title="App" />

        <View style={styles.card}>

          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage app notifications"
            onPress={handleNotifications}
          />

          <View style={styles.divider} />

          <SettingItem
            icon="information-circle-outline"
            title="About"
            subtitle="Playmaker FC app information"
            onPress={handleAbout}
          />

        </View>

        {/* ======================================================
            ACCOUNT ROLE
        ====================================================== */}

        <View style={styles.accountCard}>

          <View style={styles.accountIcon}>
            <Ionicons
              name={
                isAdmin
                  ? "shield-checkmark-outline"
                  : "person-circle-outline"
              }
              size={22}
              color={colors.primary}
            />
          </View>

          <View style={styles.accountInfo}>

            <Text style={styles.accountName}>
              {user?.username || "User"}
            </Text>

            <Text style={styles.accountRole}>
              {isAdmin
                ? "Administrator"
                : "Coach"}
            </Text>

          </View>

        </View>

        {/* ======================================================
            VERSION
        ====================================================== */}

        <Text style={styles.version}>
          Playmaker FC • Version 1.0.0
        </Text>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({

  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
  },

  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  settingItem: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 13,
  },

  settingTextWrap: {
    flex: 1,
    paddingRight: 10,
  },

  settingTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },

  settingSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: 70,
  },

  accountCard: {
    marginTop: spacing.xl,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
  },

  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  accountInfo: {
    flex: 1,
  },

  accountName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },

  accountRole: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },

  version: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },

});