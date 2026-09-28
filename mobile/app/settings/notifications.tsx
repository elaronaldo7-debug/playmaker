import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import { colors, spacing, typography } from "@/constants/theme";

type NotificationItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function NotificationItem({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: NotificationItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.iconBox}>
        <Ionicons
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {title}
        </Text>

        <Text style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: "#374151",
          true: colors.primary,
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#374151"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const [birthdayReminders, setBirthdayReminders] =
    useState(true);

  const [attendanceReminders, setAttendanceReminders] =
    useState(false);

  const [feeReminders, setFeeReminders] =
    useState(false);

  const [notificationSound, setNotificationSound] =
    useState(true);

  const showInfo = (title: string) => {
    Alert.alert(
      title,
      "Notification preferences are saved for this device."
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <Header
        title="Notifications"
        subtitle="Manage app notifications"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* =====================================================
            GENERAL
        ===================================================== */}

        <Text style={styles.sectionTitle}>
          GENERAL
        </Text>

        <View style={styles.card}>
          <NotificationItem
            icon="notifications-outline"
            title="Birthday Reminders"
            subtitle="Show upcoming player birthdays"
            value={birthdayReminders}
            onChange={(value) => {
              setBirthdayReminders(value);
              showInfo("Birthday Reminders");
            }}
          />

          <View style={styles.divider} />

          <NotificationItem
            icon="calendar-outline"
            title="Attendance Reminders"
            subtitle="Remind coaches about attendance"
            value={attendanceReminders}
            onChange={(value) => {
              setAttendanceReminders(value);
              showInfo("Attendance Reminders");
            }}
          />

          <View style={styles.divider} />

          <NotificationItem
            icon="cash-outline"
            title="Fee Reminders"
            subtitle="Show pending fee reminders"
            value={feeReminders}
            onChange={(value) => {
              setFeeReminders(value);
              showInfo("Fee Reminders");
            }}
          />
        </View>

        {/* =====================================================
            SOUND
        ===================================================== */}

        <Text style={styles.sectionTitle}>
          SOUND
        </Text>

        <View style={styles.card}>
          <NotificationItem
            icon="volume-high-outline"
            title="Notification Sound"
            subtitle="Play a sound for notifications"
            value={notificationSound}
            onChange={(value) => {
              setNotificationSound(value);
              showInfo("Notification Sound");
            }}
          />
        </View>

        {/* =====================================================
            INFO
        ===================================================== */}

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={colors.textMuted}
            />
          </View>

          <Text style={styles.infoText}>
            Birthday reminders are intended to
            show from one day before the player's
            birthday through the birthday date.
          </Text>
        </View>

        {/* =====================================================
            STATUS
        ===================================================== */}

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons
              name="checkmark-circle-outline"
              size={25}
              color="#22C55E"
            />
          </View>

          <View style={styles.statusTextWrap}>
            <Text style={styles.statusTitle}>
              Notifications
            </Text>

            <Text style={styles.statusSubtitle}>
              Your notification preferences are
              currently active.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },

  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
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

  item: {
    minHeight: 82,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 13,
  },

  textWrap: {
    flex: 1,
    paddingRight: 10,
  },

  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },

  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: 72,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.lg,
    paddingHorizontal: 5,
  },

  infoIcon: {
    marginRight: 10,
  },

  infoText: {
    flex: 1,
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 23,
  },

  statusCard: {
    marginTop: spacing.lg,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.18)",
    backgroundColor: "rgba(34,197,94,0.06)",
    flexDirection: "row",
    alignItems: "center",
  },

  statusIcon: {
    marginRight: 12,
  },

  statusTextWrap: {
    flex: 1,
  },

  statusTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },

  statusSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },
});