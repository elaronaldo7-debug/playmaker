import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import {
  colors,
  spacing,
  radius,
  typography,
} from "@/constants/theme";

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

function getPhotoUrl(photo?: string | null) {
  if (!photo) {
    return null;
  }

  // Already an absolute URL
  if (
    photo.startsWith("http://") ||
    photo.startsWith("https://") ||
    photo.startsWith("data:")
  ) {
    return photo;
  }

  const apiBaseUrl =
    (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
    "http://localhost:5000/api";

  // Remove /api from the end
  const serverUrl = apiBaseUrl.replace(/\/api\/?$/, "");

  if (photo.startsWith("/")) {
    return `${serverUrl}${photo}`;
  }

  return `${serverUrl}/${photo}`;
}

export default function PlayerCard({
  player,
  onPress,
}: {
  player: PlayerListItem;
  onPress: () => void;
}) {
  const [imageVisible, setImageVisible] = useState(false);

  const photoUrl = getPhotoUrl(player.profile_photo);

  return (
    <>
      {/* =========================
          PLAYER CARD
      ========================== */}

      <View style={styles.container}>

        {/* =========================
            PROFILE PHOTO
        ========================== */}

        <TouchableOpacity
          style={styles.photoButton}
          activeOpacity={0.8}
          disabled={!photoUrl}
          onPress={() => {
            if (photoUrl) {
              setImageVisible(true);
            }
          }}
        >
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={styles.avatarImg}
              resizeMode="cover"
              onError={(error) => {
                console.log(
                  "PLAYER PHOTO ERROR:",
                  player.player_name,
                  photoUrl,
                  error.nativeEvent
                );
              }}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initials(player.player_name)}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* =========================
            PLAYER INFO
        ========================== */}

        <TouchableOpacity
          style={styles.infoButton}
          activeOpacity={0.75}
          onPress={onPress}
        >
          <View style={styles.info}>
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {player.player_name}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.meta}>
                {player.player_id}
              </Text>

              {player.category_name ? (
                <>
                  <Text style={styles.dot}>
                    {"\u2022"}
                  </Text>

                  <Text style={styles.meta}>
                    {player.category_name}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          {/* INACTIVE */}

          {player.status === "INACTIVE" && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>
                Inactive
              </Text>
            </View>
          )}

          {/* ARROW */}

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* =========================
          FULL SCREEN PHOTO
      ========================== */}

      <Modal
        visible={imageVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setImageVisible(false);
        }}
      >
        <View style={styles.modalContainer}>

          {/* DARK BACKGROUND */}

          <Pressable
            style={styles.modalBackground}
            onPress={() => {
              setImageVisible(false);
            }}
          />

          {/* CLOSE BUTTON */}

          <Pressable
            style={styles.closeButton}
            onPress={() => {
              setImageVisible(false);
            }}
          >
            <Ionicons
              name="close"
              size={28}
              color={colors.white}
            />
          </Pressable>

          {/* LARGE IMAGE */}

          {photoUrl ? (
            <View style={styles.largeImageContainer}>
              <Image
                source={{ uri: photoUrl }}
                style={styles.largeImage}
                resizeMode="contain"
              />
            </View>
          ) : null}

          {/* PLAYER DETAILS */}

          <View style={styles.imageNameContainer}>
            <Text style={styles.imageName}>
              {player.player_name}
            </Text>

            <Text style={styles.imagePlayerId}>
              {player.player_id}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({

  /* =========================
     CARD
  ========================== */

  container: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: colors.card,

    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,

    padding: spacing.md,

    marginBottom: spacing.sm,
  },

  /* =========================
     PHOTO
  ========================== */

  photoButton: {
    width: 44,
    height: 44,

    borderRadius: 22,

    overflow: "hidden",

    marginRight: spacing.md,
  },

  avatar: {
    width: 44,
    height: 44,

    borderRadius: 22,

    backgroundColor: colors.primarySoft,

    alignItems: "center",
    justifyContent: "center",
  },

  avatarImg: {
    width: 44,
    height: 44,

    borderRadius: 22,
  },

  avatarText: {
    ...typography.bodyBold,
    color: colors.primary,
  },

  /* =========================
     PLAYER INFO BUTTON
  ========================== */

  infoButton: {
    flex: 1,

    flexDirection: "row",
    alignItems: "center",

    minWidth: 0,
  },

  info: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",

    marginTop: 2,

    gap: 4,
  },

  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  dot: {
    color: colors.textMuted,
    fontSize: 10,
  },

  /* =========================
     INACTIVE
  ========================== */

  inactiveBadge: {
    backgroundColor: colors.absentSoft,

    paddingHorizontal: spacing.sm,
    paddingVertical: 3,

    borderRadius: radius.pill,

    marginRight: spacing.sm,
  },

  inactiveText: {
    ...typography.caption,

    color: colors.absent,

    fontSize: 10,
  },

  /* =========================
     FULL SCREEN MODAL
  ========================== */

  modalContainer: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.96)",

    justifyContent: "center",
    alignItems: "center",
  },

  modalBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  /* =========================
     LARGE IMAGE
  ========================== */

  largeImageContainer: {
    width: "92%",
    height: "75%",

    justifyContent: "center",
    alignItems: "center",

    zIndex: 2,
  },

  largeImage: {
    width: "100%",
    height: "100%",
  },

  /* =========================
     CLOSE
  ========================== */

  closeButton: {
    position: "absolute",

    top: 40,
    right: 20,

    width: 46,
    height: 46,

    borderRadius: 23,

    backgroundColor: "rgba(255,255,255,0.15)",

    alignItems: "center",
    justifyContent: "center",

    zIndex: 10,
  },

  /* =========================
     NAME
  ========================== */

  imageNameContainer: {
    position: "absolute",

    bottom: 35,

    alignItems: "center",

    paddingHorizontal: 20,

    zIndex: 5,
  },

  imageName: {
    color: colors.white,

    fontSize: 19,
    fontWeight: "700",

    textAlign: "center",
  },

  imagePlayerId: {
    color: colors.textSecondary,

    fontSize: 13,

    marginTop: 4,
  },
});