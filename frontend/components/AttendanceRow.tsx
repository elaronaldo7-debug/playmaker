import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "@/constants/theme";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "UNMARKED";

interface AttendanceRowProps {
  playerName: string;
  profilePhoto?: string | null;
  status: AttendanceStatus;
  onMarkPresent: () => void;
  onMarkAbsent: () => void;
  disabled?: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function AttendanceRow({
  playerName,
  profilePhoto,
  status,
  onMarkPresent,
  onMarkAbsent,
  disabled = false,
}: AttendanceRowProps) {
  return (
    <View style={styles.container}>
      {profilePhoto ? (
        <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(playerName)}</Text>
        </View>
      )}

      <Text style={styles.name} numberOfLines={1}>
        {playerName}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, status === "PRESENT" && styles.btnPresentActive]}
          onPress={onMarkPresent}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Ionicons
            name="checkmark"
            size={16}
            color={status === "PRESENT" ? colors.white : colors.present}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, status === "ABSENT" && styles.btnAbsentActive]}
          onPress={onMarkAbsent}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Ionicons
            name="close"
            size={16}
            color={status === "ABSENT" ? colors.white : colors.absent}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { ...typography.captionBold, color: colors.primary },
  name: { flex: 1, ...typography.bodyBold, color: colors.textPrimary },
  actions: { flexDirection: "row", gap: spacing.xs },
  btn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPresentActive: { backgroundColor: colors.present, borderColor: colors.present },
  btnAbsentActive: { backgroundColor: colors.absent, borderColor: colors.absent },
});
