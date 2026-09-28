import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "@/constants/theme";

export interface PlayerListItem {
  id: number;
  player_id: string;
  player_name: string;
  profile_photo?: string | null;
  category_name?: string | null;
  status: "ACTIVE" | "INACTIVE";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function PlayerCard({
  player,
  onPress,
}: {
  player: PlayerListItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      {player.profile_photo ? (
        <Image source={{ uri: player.profile_photo }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(player.player_name)}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {player.player_name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{player.player_id}</Text>
          {player.category_name ? (
            <>
              <Text style={styles.dot}>{"\u2022"}</Text>
              <Text style={styles.meta}>{player.category_name}</Text>
            </>
          ) : null}
        </View>
      </View>

      {player.status === "INACTIVE" && (
        <View style={styles.inactiveBadge}>
          <Text style={styles.inactiveText}>Inactive</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
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
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { ...typography.bodyBold, color: colors.primary },
  info: { flex: 1 },
  name: { ...typography.bodyBold, color: colors.textPrimary },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 },
  meta: { ...typography.caption, color: colors.textSecondary },
  dot: { color: colors.textMuted, fontSize: 10 },
  inactiveBadge: {
    backgroundColor: colors.absentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  inactiveText: { ...typography.caption, color: colors.absent, fontSize: 10 },
});
