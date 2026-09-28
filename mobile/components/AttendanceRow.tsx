import React from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  colors,
  spacing,
  radius,
  typography,
} from "@/constants/theme";

/*
 * ------------------------------------------------
 * ATTENDANCE STATUS
 * ------------------------------------------------
 */

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "UNMARKED";

/*
 * ------------------------------------------------
 * PROPS
 * ------------------------------------------------
 */

interface AttendanceRowProps {
  playerId?: number;

  playerName: string;

  profilePhoto?: string | null;

  status: AttendanceStatus;

  onMarkPresent: () => void;

  onMarkAbsent: () => void;

  onPressProfile?: () => void;

  onDelete?: () => void;

  canDelete?: boolean;

  disabled?: boolean;
}

/*
 * ------------------------------------------------
 * INITIALS
 * ------------------------------------------------
 */

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (word) =>
        word.charAt(0).toUpperCase()
    )
    .join("");
}

/*
 * ------------------------------------------------
 * COMPONENT
 * ------------------------------------------------
 */

export default function AttendanceRow({
  playerId,
  playerName,
  profilePhoto,
  status,
  onMarkPresent,
  onMarkAbsent,
  onPressProfile,
  onDelete,
  canDelete = false,
  disabled = false,
}: AttendanceRowProps) {
  const isPresent =
    status === "PRESENT";

  const isAbsent =
    status === "ABSENT";

  return (
    <View style={styles.container}>
      {/* ------------------------------------------
          PLAYER AREA
      ------------------------------------------- */}

      <TouchableOpacity
        style={styles.playerArea}
        onPress={onPressProfile}
        disabled={!onPressProfile}
        activeOpacity={0.7}
      >
        {/* PROFILE PHOTO */}

        {profilePhoto ? (
          <Image
            source={{
              uri: profilePhoto,
            }}
            style={styles.avatarImg}
          />
        ) : (
          <View style={styles.avatar}>
            <Text
              style={
                styles.avatarText
              }
            >
              {initials(playerName)}
            </Text>
          </View>
        )}

        {/* NAME */}

        <View style={styles.nameWrap}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {playerName}
          </Text>

          {onPressProfile && (
            <Text
              style={
                styles.viewProfile
              }
            >
              View profile
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* ------------------------------------------
          ACTION BUTTONS
      ------------------------------------------- */}

      <View style={styles.actions}>
        {/* PRESENT */}

        <TouchableOpacity
          style={[
            styles.attendanceButton,
            styles.presentButton,
            isPresent &&
              styles.presentButtonActive,
          ]}
          onPress={
            onMarkPresent
          }
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Ionicons
            name="checkmark"
            size={16}
            color={
              isPresent
                ? colors.white
                : colors.present
            }
          />

          <Text
            style={[
              styles.attendanceText,
              styles.presentText,
              isPresent &&
                styles.activeText,
            ]}
          >
            Present
          </Text>
        </TouchableOpacity>

        {/* ABSENT */}

        <TouchableOpacity
          style={[
            styles.attendanceButton,
            styles.absentButton,
            isAbsent &&
              styles.absentButtonActive,
          ]}
          onPress={
            onMarkAbsent
          }
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Ionicons
            name="close"
            size={16}
            color={
              isAbsent
                ? colors.white
                : colors.absent
            }
          />

          <Text
            style={[
              styles.attendanceText,
              styles.absentText,
              isAbsent &&
                styles.activeText,
            ]}
          >
            Absent
          </Text>
        </TouchableOpacity>

        {/* DELETE */}

        {canDelete &&
          onDelete && (
            <TouchableOpacity
              style={
                styles.deleteButton
              }
              onPress={onDelete}
              disabled={disabled}
              activeOpacity={0.75}
            >
              <Ionicons
                name="trash-outline"
                size={19}
                color={
                  colors.absent
                }
              />
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

/*
 * ------------------------------------------------
 * STYLES
 * ------------------------------------------------
 */

const styles =
  StyleSheet.create({
    /*
     * MAIN ROW
     */

    container: {
      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        colors.card,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      padding: spacing.sm,

      marginBottom:
        spacing.sm,

      gap: spacing.sm,
    },

    /*
     * PLAYER AREA
     */

    playerArea: {
      flex: 1,

      flexDirection: "row",

      alignItems: "center",

      minWidth: 0,
    },

    /*
     * DEFAULT AVATAR
     */

    avatar: {
      width: 40,

      height: 40,

      borderRadius: 20,

      backgroundColor:
        colors.primarySoft,

      alignItems: "center",

      justifyContent:
        "center",
    },

    /*
     * PROFILE IMAGE
     */

    avatarImg: {
      width: 40,

      height: 40,

      borderRadius: 20,
    },

    /*
     * INITIALS
     */

    avatarText: {
      ...typography.captionBold,

      color:
        colors.primary,
    },

    /*
     * NAME WRAPPER
     */

    nameWrap: {
      flex: 1,

      marginLeft:
        spacing.sm,

      minWidth: 0,
    },

    /*
     * PLAYER NAME
     */

    name: {
      ...typography.bodyBold,

      color:
        colors.textPrimary,
    },

    /*
     * VIEW PROFILE
     */

    viewProfile: {
      ...typography.caption,

      color:
        colors.primary,

      marginTop: 2,
    },

    /*
     * ACTIONS
     */

    actions: {
      flexDirection: "row",

      alignItems: "center",

      gap: spacing.xs,
    },

    /*
     * PRESENT / ABSENT BUTTON
     */

    attendanceButton: {
      minWidth: 76,

      height: 36,

      paddingHorizontal: 8,

      borderRadius:
        radius.sm,

      borderWidth: 1,

      alignItems: "center",

      justifyContent:
        "center",

      flexDirection: "row",

      gap: 4,
    },

    /*
     * PRESENT
     */

    presentButton: {
      borderColor:
        colors.present,

      backgroundColor:
        "transparent",
    },

    presentButtonActive: {
      backgroundColor:
        colors.present,

      borderColor:
        colors.present,
    },

    /*
     * ABSENT
     */

    absentButton: {
      borderColor:
        colors.absent,

      backgroundColor:
        "transparent",
    },

    absentButtonActive: {
      backgroundColor:
        colors.absent,

      borderColor:
        colors.absent,
    },

    /*
     * BUTTON TEXT
     */

    attendanceText: {
      ...typography.captionBold,
    },

    presentText: {
      color:
        colors.present,
    },

    absentText: {
      color:
        colors.absent,
    },

    activeText: {
      color:
        colors.white,
    },

    /*
     * DELETE BUTTON
     */

    deleteButton: {
      width: 36,

      height: 36,

      borderRadius:
        radius.sm,

      borderWidth: 1,

      borderColor:
        colors.absent,

      alignItems: "center",

      justifyContent:
        "center",

      backgroundColor:
        "transparent",
    },
  });