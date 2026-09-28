import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const role = String(user?.role || "COACH").toUpperCase();
  const isAdmin = role === "ADMIN";

  const displayName =
    user?.name ||
    user?.full_name ||
    user?.username ||
    "User";

  const username =
    user?.username ||
    user?.user_id ||
    user?.id ||
    "—";

  const categoryName =
    user?.category_name ||
    user?.category?.name ||
    user?.coach?.category_name ||
    "Not assigned";

  const isActive =
    user?.is_active !== false;

  return (
    <ScreenContainer scroll={false}>
      <Header
        title="Profile"
        subtitle="Your account information"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* PROFILE HEADER */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>
            {displayName}
          </Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name={
                isAdmin
                  ? "shield-checkmark-outline"
                  : "football-outline"
              }
              size={15}
              color={colors.primary}
            />

            <Text style={styles.roleText}>
              {isAdmin ? "Administrator" : "Coach"}
            </Text>
          </View>
        </View>

        {/* ACCOUNT INFORMATION */}
        <Text style={styles.sectionTitle}>
          ACCOUNT INFORMATION
        </Text>

        <View style={styles.card}>
          <InfoRow
            icon="person-outline"
            label="Name"
            value={displayName}
          />

          <Divider />

          <InfoRow
            icon="at-outline"
            label="Username / User ID"
            value={String(username)}
          />

          <Divider />

          <InfoRow
            icon="shield-outline"
            label="Role"
            value={isAdmin ? "Administrator" : "Coach"}
          />

          <Divider />

          <InfoRow
            icon="checkmark-circle-outline"
            label="Account Status"
            value={isActive ? "Active" : "Inactive"}
            valueColor={
              isActive ? "#22C55E" : "#EF4444"
            }
          />
        </View>

        {/* COACH INFORMATION */}
        {!isAdmin && (
          <>
            <Text style={styles.sectionTitle}>
              COACH INFORMATION
            </Text>

            <View style={styles.card}>
              <InfoRow
                icon="layers-outline"
                label="Assigned Category"
                value={categoryName}
              />
            </View>
          </>
        )}

        {/* ADMIN INFORMATION */}
        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>
              ACCESS
            </Text>

            <View style={styles.card}>
              <AccessRow
                icon="people-outline"
                title="Players"
                enabled
              />

              <Divider />

              <AccessRow
                icon="calendar-outline"
                title="Attendance"
                enabled
              />

              <Divider />

              <AccessRow
                icon="cash-outline"
                title="Fees"
                enabled
              />

              <Divider />

              <AccessRow
                icon="bar-chart-outline"
                title="Reports"
                enabled
              />

              <Divider />

              <AccessRow
                icon="settings-outline"
                title="Administration"
                enabled
              />
            </View>
          </>
        )}

        {/* SECURITY NOTE */}
        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>
              Account Security
            </Text>

            <Text style={styles.securitySubtitle}>
              You can change your password from the
              Change Password section in Settings.
            </Text>
          </View>
        </View>

        <Text style={styles.versionText}>
          Playmaker FC • Profile
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={colors.primary}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            valueColor ? { color: valueColor } : null,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function AccessRow({
  icon,
  title,
  enabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  enabled: boolean;
}) {
  return (
    <View style={styles.accessRow}>
      <View style={styles.accessLeft}>
        <View style={styles.accessIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={colors.primary}
          />
        </View>

        <Text style={styles.accessTitle}>
          {title}
        </Text>
      </View>

      <View style={styles.accessStatus}>
        <Ionicons
          name={
            enabled
              ? "checkmark-circle"
              : "close-circle"
          }
          size={19}
          color={
            enabled
              ? "#22C55E"
              : "#EF4444"
          }
        />

        <Text
          style={[
            styles.accessStatusText,
            {
              color: enabled
                ? "#22C55E"
                : "#EF4444",
            },
          ]}
        >
          {enabled ? "Allowed" : "Restricted"}
        </Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
  },

  profileCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    paddingVertical: 25,
    paddingHorizontal: 18,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginBottom: 12,
  },

  avatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  name: {
    fontSize: 21,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 9,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  roleText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    overflow: "hidden",
  },

  infoRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 11,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 13,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: 68,
  },

  accessRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },

  accessLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  accessIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 12,
  },

  accessTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  accessStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  accessStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  securityCard: {
    marginTop: spacing.lg,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
  },

  securityIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 12,
  },

  securityText: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  securitySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 4,
  },

  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
});