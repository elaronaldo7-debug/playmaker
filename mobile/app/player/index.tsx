import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";

import { useAuth } from "@/context/AuthContext";
import api, { apiErrorMessage } from "@/services/api";
import { colors, spacing, radius } from "@/constants/theme";

type AttendanceSummary = {
  total_days?: number;
  present?: number;
  absent?: number;
  attendance_percentage?: number;
};

type PlayerProfile = {
  id: number;
  player_id: string;
  player_name: string;
  profile_photo?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  school?: string | null;
  standard?: string | null;
  phone_1?: string | null;
  phone_2?: string | null;
  pickup_person?: string | null;
  health_condition?: string | null;
  status?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  monthly_fee?: number | null;
  has_login?: boolean;
  attendance_summary?: AttendanceSummary | null;
};

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  "http://localhost:5000/api";

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

function getPhotoUrl(photo?: string | null) {
  if (!photo) {
    return null;
  }

  if (photo.startsWith("http://") || photo.startsWith("https://")) {
    return photo;
  }

  if (photo.startsWith("/")) {
    return `${SERVER_BASE_URL}${photo}`;
  }

  return `${SERVER_BASE_URL}/${photo}`;
}

function formatDate(dateString?: string | null) {
  if (!dateString) {
    return "Not available";
  }

  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function displayValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | number | null;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>
          {displayValue(value)}
        </Text>
      </View>
    </View>
  );
}

type SectionProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
};

function Section({ title, icon, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>

        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadMyProfile = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/players/me");

      const responseData = response.data;

      /*
       * Supports all of these possible API response formats:
       *
       * 1. { ...player }
       * 2. { player: { ...player } }
       * 3. { data: { ...player } }
       * 4. { success: true, data: { ...player } }
       */

      const profile =
        responseData?.data?.player ??
        responseData?.data ??
        responseData?.player ??
        responseData;

      if (!profile || !profile.id) {
        throw new Error("Player profile was not found.");
      }

      setPlayer(profile);
    } catch (err) {
      console.error("PLAYER PROFILE ERROR:", err);

      setError(apiErrorMessage(err));

      setPlayer(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMyProfile();
  }, [loadMyProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMyProfile();
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("PLAYER LOGOUT ERROR:", error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <Header
          title="My Profile"
          subtitle="Player"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Loading your profile...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!player) {
    return (
      <ScreenContainer>
        <Header
          title="My Profile"
          subtitle="Player"
        />

        <View style={styles.errorContainer}>
          <EmptyState
            icon="person-outline"
            title="Profile not available"
            message={
              error ||
              "Your player profile could not be loaded."
            }
          />

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadMyProfile}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={19}
              color={colors.primary}
            />

            <Text style={styles.logoutButtonText}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const photoUrl = getPhotoUrl(player.profile_photo);

  const attendance = player.attendance_summary;

  const attendancePercentage =
    attendance?.attendance_percentage ?? 0;

  return (
    <ScreenContainer>
      <Header
        title="My Profile"
        subtitle={player.player_id}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* PROFILE HEADER */}
        <View style={styles.profileHeader}>
          <View style={styles.photoContainer}>
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.profilePhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Ionicons
                  name="person"
                  size={48}
                  color={colors.textMuted}
                />
              </View>
            )}
          </View>

          <Text style={styles.playerName}>
            {player.player_name}
          </Text>

          <Text style={styles.playerCode}>
            {player.player_id}
          </Text>

          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              {player.status || "ACTIVE"}
            </Text>
          </View>
        </View>

        {/* PERSONAL DETAILS */}
        <Section
          title="Personal Details"
          icon="person-outline"
        >
          <InfoRow
            icon="card-outline"
            label="Player ID"
            value={player.player_id}
          />

          <InfoRow
            icon="calendar-outline"
            label="Date of Birth"
            value={formatDate(player.date_of_birth)}
          />

          <InfoRow
            icon="hourglass-outline"
            label="Age"
            value={
              player.age !== null &&
              player.age !== undefined
                ? `${player.age} years`
                : null
            }
          />
        </Section>

        {/* ACADEMY DETAILS */}
        <Section
          title="Academy Details"
          icon="football-outline"
        >
          <InfoRow
            icon="layers-outline"
            label="Category"
            value={player.category_name}
          />

          <InfoRow
            icon="checkmark-circle-outline"
            label="Status"
            value={player.status}
          />

          {player.monthly_fee !== null &&
            player.monthly_fee !== undefined && (
              <InfoRow
                icon="cash-outline"
                label="Monthly Fee"
                value={`₹${player.monthly_fee}`}
              />
            )}
        </Section>

        {/* SCHOOL DETAILS */}
        <Section
          title="School Details"
          icon="school-outline"
        >
          <InfoRow
            icon="business-outline"
            label="School"
            value={player.school}
          />

          <InfoRow
            icon="book-outline"
            label="Standard"
            value={player.standard}
          />
        </Section>

        {/* CONTACT DETAILS */}
        <Section
          title="Contact Details"
          icon="call-outline"
        >
          <InfoRow
            icon="call-outline"
            label="Primary Phone"
            value={player.phone_1}
          />

          <InfoRow
            icon="call-outline"
            label="Secondary Phone"
            value={player.phone_2}
          />

          <InfoRow
            icon="person-circle-outline"
            label="Pickup Person"
            value={player.pickup_person}
          />
        </Section>

        {/* HEALTH DETAILS */}
        <Section
          title="Health Information"
          icon="medical-outline"
        >
          <View style={styles.healthContainer}>
            <Text style={styles.infoLabel}>
              Health Condition
            </Text>

            <Text style={styles.healthText}>
              {player.health_condition ||
                "No health condition recorded."}
            </Text>
          </View>
        </Section>

        {/* ATTENDANCE */}
        <Section
          title="Attendance"
          icon="calendar-number-outline"
        >
          <View style={styles.attendanceStats}>
            <View style={styles.attendanceStat}>
              <Text style={styles.attendanceNumber}>
                {attendance?.total_days ?? 0}
              </Text>

              <Text style={styles.attendanceLabel}>
                Total Days
              </Text>
            </View>

            <View style={styles.attendanceDivider} />

            <View style={styles.attendanceStat}>
              <Text style={styles.attendanceNumber}>
                {attendance?.present ?? 0}
              </Text>

              <Text style={styles.attendanceLabel}>
                Present
              </Text>
            </View>

            <View style={styles.attendanceDivider} />

            <View style={styles.attendanceStat}>
              <Text style={styles.attendanceNumber}>
                {attendance?.absent ?? 0}
              </Text>

              <Text style={styles.attendanceLabel}>
                Absent
              </Text>
            </View>
          </View>

          <View style={styles.attendancePercentageBox}>
            <View style={styles.attendancePercentageHeader}>
              <Text style={styles.attendancePercentageLabel}>
                Attendance Percentage
              </Text>

              <Text style={styles.attendancePercentageValue}>
                {attendancePercentage}%
              </Text>
            </View>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      Math.max(attendancePercentage, 0),
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        </Section>

        {/* READ ONLY NOTICE */}
        <View style={styles.readOnlyNotice}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={colors.textSecondary}
          />

          <Text style={styles.readOnlyText}>
            Your profile is read-only. Contact the academy
            if any information needs to be updated.
          </Text>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutFullButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.logoutFullButtonText}>
            Logout
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },

  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },

  retryButton: {
    marginTop: spacing.lg,
    minWidth: 140,
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  logoutButton: {
    marginTop: spacing.md,
    minWidth: 140,
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoutButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },

  profileHeader: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },

  photoContainer: {
    marginBottom: spacing.md,
  },

  profilePhoto: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.card,
  },

  profilePhotoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  playerName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },

  playerCode: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  statusBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.presentSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.present,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.present,
  },

  section: {
    marginTop: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },

  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  healthContainer: {
    padding: spacing.md,
  },

  healthText: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },

  attendanceStats: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },

  attendanceStat: {
    flex: 1,
    alignItems: "center",
  },

  attendanceNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },

  attendanceLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },

  attendanceDivider: {
    width: 1,
    height: 38,
    backgroundColor: colors.cardBorder,
  },

  attendancePercentageBox: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },

  attendancePercentageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  attendancePercentageLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  attendancePercentageValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },

  progressBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardBorder,
    overflow: "hidden",
  },

  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  readOnlyNotice: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  readOnlyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  logoutFullButton: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  logoutFullButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomSpace: {
    height: spacing.xl,
  },
});