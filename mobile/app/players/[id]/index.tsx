import React, { useCallback, useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import EmptyState from "@/components/EmptyState";

import { useAuth } from "@/context/AuthContext";
import { canEditPlayers } from "@/utils/permissions";
import api, { apiErrorMessage } from "@/services/api";

import {
  colors,
  spacing,
  radius,
} from "@/constants/theme";

import { Player } from "@/types";

/* ============================================================ */
/* API SERVER URL */
/* ============================================================ */

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  "http://localhost:5000/api";

const API_SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, "");

/* ============================================================ */
/* MAIN SCREEN */
/* ============================================================ */

export default function PlayerProfileScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const router = useRouter();

  const { user } = useAuth();

  const [player, setPlayer] =
    useState<Player | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [photoLoading, setPhotoLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [showStatusModal, setShowStatusModal] =
    useState(false);

  const [showPhotoViewer, setShowPhotoViewer] =
    useState(false);

  const [statusAction, setStatusAction] =
    useState<
      "ACTIVATE" |
      "DEACTIVATE" |
      "DELETE" |
      null
    >(null);

  /* ========================================================== */
  /* LOAD PLAYER */
  /* ========================================================== */

  const loadPlayer = useCallback(
    async () => {
      if (!id) {
        setError("Player ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data } =
          await api.get<Player>(
            `/players/${id}`
          );

        console.log(
          "PLAYER PROFILE DATA:",
          data
        );

        console.log(
          "ATTENDANCE HISTORY:",
          data.attendance_history
        );

        setPlayer(data);
        setError(null);
      } catch (e) {
        setError(
          apiErrorMessage(
            e,
            "Could not load player profile"
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  /* ========================================================== */
  /* PROFILE PHOTO */
  /* ========================================================== */

  const pickProfilePhoto =
    async () => {
      try {
        /* ---------------------------------------------------- */
        /* PHOTO PERMISSION */
        /* ---------------------------------------------------- */

        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Permission Required",
            "Please allow photo access to select a profile photo."
          );

          return;
        }

        /* ---------------------------------------------------- */
        /* OPEN GALLERY */
        /* ---------------------------------------------------- */

        const result =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes: ["images"],

              /*
               * IMPORTANT:
               * Force square selection.
               * The final profile image will be circular.
               */

              allowsEditing: true,

              aspect: [1, 1],

              quality: 0.85,
            });

        /* ---------------------------------------------------- */
        /* USER CANCELLED */
        /* ---------------------------------------------------- */

        if (
          result.canceled ||
          !result.assets ||
          result.assets.length === 0
        ) {
          return;
        }

        const asset =
          result.assets[0];

        /* ---------------------------------------------------- */
        /* START LOADING */
        /* ---------------------------------------------------- */

        setPhotoLoading(true);

        /* ---------------------------------------------------- */
        /* CHECK PLAYER */
        /* ---------------------------------------------------- */

        if (!player?.id) {
          Alert.alert(
            "Error",
            "Player ID is missing."
          );

          setPhotoLoading(false);

          return;
        }

        /* ---------------------------------------------------- */
        /* FORM DATA */
        /* ---------------------------------------------------- */

        const formData =
          new FormData();

        const filename =
          asset.fileName ||
          `player_${player.id}.jpg`;

        const mimeType =
          asset.mimeType ||
          "image/jpeg";

        /* ---------------------------------------------------- */
        /* WEB */
        /* ---------------------------------------------------- */

        if (asset.file) {
          formData.append(
            "photo",
            asset.file
          );
        }

        /* ---------------------------------------------------- */
        /* ANDROID / IOS */
        /* ---------------------------------------------------- */

        else {
          formData.append(
            "photo",
            {
              uri: asset.uri,
              name: filename,
              type: mimeType,
            } as any
          );
        }

        /* ---------------------------------------------------- */
        /* UPLOAD TO FLASK */
        /* ---------------------------------------------------- */

        console.log(
          "Uploading profile photo...",
          {
            playerId: player.id,
            filename,
            mimeType,
          }
        );

        const { data } =
          await api.post<Player>(
            `/players/${player.id}/photo`,
            formData,
            {
              headers: {
                "Content-Type":
                  "multipart/form-data",
              },
            }
          );

        /* ---------------------------------------------------- */
        /* UPDATE PLAYER */
        /* ---------------------------------------------------- */

        setPlayer(data);

        /* ---------------------------------------------------- */
        /* SUCCESS */
        /* ---------------------------------------------------- */

        Alert.alert(
          "Success",
          "Profile photo updated successfully."
        );
      } catch (e) {
        console.error(
          "PROFILE PHOTO UPLOAD ERROR:",
          e
        );

        Alert.alert(
          "Upload Failed",
          apiErrorMessage(
            e,
            "Could not upload profile photo"
          )
        );
      } finally {
        setPhotoLoading(false);
      }
    };

  /* ========================================================== */
  /* PLAYER STATUS ACTIONS */
  /* ========================================================== */

  const openStatusAction = (
    action:
      | "ACTIVATE"
      | "DEACTIVATE"
      | "DELETE"
  ) => {
    setStatusAction(action);
    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    if (actionLoading) return;

    setShowStatusModal(false);
    setStatusAction(null);
  };

  const executeStatusAction =
    async () => {
      if (!player || !statusAction) {
        return;
      }

      try {
        setActionLoading(true);

        /* -------------------------------------------------- */
        /* ACTIVATE / DEACTIVATE */
        /* -------------------------------------------------- */

        if (
          statusAction === "ACTIVATE" ||
          statusAction === "DEACTIVATE"
        ) {
          const newStatus =
            statusAction === "ACTIVATE"
              ? "ACTIVE"
              : "INACTIVE";

          const { data } =
            await api.patch<Player>(
              `/players/${player.id}/status`,
              {
                status: newStatus,
              }
            );

          setPlayer(data);

          setShowStatusModal(false);
          setStatusAction(null);

          Alert.alert(
            "Success",
            newStatus === "ACTIVE"
              ? "Player activated successfully."
              : "Player moved to inactive players."
          );

          return;
        }

        /* -------------------------------------------------- */
        /* DELETE */
        /* -------------------------------------------------- */

        if (statusAction === "DELETE") {
          await api.delete(
            `/players/${player.id}`
          );

          setShowStatusModal(false);
          setStatusAction(null);

          Alert.alert(
            "Player Deleted",
            "Player has been permanently deleted.",
            [
              {
                text: "OK",
                onPress: () =>
                  router.back(),
              },
            ]
          );
        }
      } catch (error) {
        Alert.alert(
          "Error",
          apiErrorMessage(
            error,
            "Could not update player"
          )
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* ========================================================== */
  /* PHOTO URL */
  /* ========================================================== */

  const getProfilePhotoUrl =
    () => {
      if (!player?.profile_photo) {
        return null;
      }

      /* Already a complete URL */

      if (
        player.profile_photo.startsWith(
          "http://"
        ) ||
        player.profile_photo.startsWith(
          "https://"
        )
      ) {
        return player.profile_photo;
      }

      /* Flask relative path */

      return (
        `${API_SERVER_URL}` +
        `${player.profile_photo}`
      );
    };

  const profilePhotoUrl =
    getProfilePhotoUrl();

  /* ========================================================== */
  /* LOADING */
  /* ========================================================== */

  if (loading) {
    return (
      <ScreenContainer>
        <Header
          title="Profile"
          leftIcon="arrow-back"
          onLeftPress={() =>
            router.back()
          }
        />

        <Loading />
      </ScreenContainer>
    );
  }

  /* ========================================================== */
  /* ERROR */
  /* ========================================================== */

  if (error || !player) {
    return (
      <ScreenContainer>
        <Header
          title="Profile"
          leftIcon="arrow-back"
          onLeftPress={() =>
            router.back()
          }
        />

        <EmptyState
          icon="alert-circle-outline"
          title="Could not load profile"
          message={
            error ||
            "Player not found"
          }
        />
      </ScreenContainer>
    );
  }

  /* ========================================================== */
  /* DATA */
  /* ========================================================== */

  const attendanceHistory =
    player.attendance_history || [];

  const fees: any[] =
    (player as any).fees || [];

  const summary =
    player.attendance_summary || {
      total_days: 0,
      present: 0,
      absent: 0,
      attendance_percentage: 0,
    };

  /* ========================================================== */
  /* UI */
  /* ========================================================== */

  return (
    <ScreenContainer scroll={false}>

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <Header
        title="Profile"
        subtitle={player.player_id}
        leftIcon="arrow-back"
        onLeftPress={() =>
          router.back()
        }
        rightIcon={
          canEditPlayers(user)
            ? "create-outline"
            : undefined
        }
        onRightPress={
          canEditPlayers(user)
            ? () =>
                router.push(
                  `/players/${player.id}/edit` as any
                )
            : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* ==================================================== */}
        {/* PROFILE PHOTO */}
        {/* ==================================================== */}

        <View
          style={
            styles.photoSection
          }
        >
          <View
            style={
              styles.photoWrapper
            }
          >

            {/* ---------------------------------------------- */}
            {/* CIRCULAR PROFILE PHOTO */}
            {/* ---------------------------------------------- */}

            <Pressable
              style={
                styles.profileCircle
              }
              onPress={() => {
                if (profilePhotoUrl) {
                  setShowPhotoViewer(true);
                }
              }}
            >
              {profilePhotoUrl ? (
                <Image
                  source={{
                    uri: profilePhotoUrl,
                  }}
                  style={
                    styles.profilePhoto
                  }
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={
                    styles.profilePlaceholder
                  }
                >
                  <Ionicons
                    name="person"
                    size={72}
                    color={
                      colors.textMuted
                    }
                  />
                </View>
              )}
            </Pressable>

            {/* ---------------------------------------------- */}
            {/* CAMERA BUTTON */}
            {/* ---------------------------------------------- */}

            <TouchableOpacity
              style={
                styles.photoEditButton
              }
              onPress={
                pickProfilePhoto
              }
              activeOpacity={0.8}
              disabled={
                photoLoading
              }
            >
              {photoLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.black}
                />
              ) : (
                <Ionicons
                  name="camera-outline"
                  size={26}
                  color={colors.black}
                />
              )}
            </TouchableOpacity>

          </View>

          <Text
            style={
              styles.changePhotoText
            }
          >
            Tap photo to view
          </Text>
        </View>

        {/* ==================================================== */}
        {/* PERSONAL DETAILS */}
        {/* ==================================================== */}

        <View
          style={styles.section}
        >
          <SectionTitle
            icon="person-outline"
            title="Personal Details"
          />

          <InfoRow
            icon="person-outline"
            label="Player Name"
            value={
              player.player_name
            }
          />

          <InfoRow
            icon="id-card-outline"
            label="Player ID"
            value={
              player.player_id
            }
          />

          <InfoRow
            icon="calendar-outline"
            label="Date of Birth"
            value={
              player.date_of_birth ||
              "Not added"
            }
          />

          <InfoRow
            icon="hourglass-outline"
            label="Age"
            value={
              player.age !== null &&
              player.age !== undefined
                ? `${player.age} years`
                : "Not available"
            }
          />

          <InfoRow
            icon="football-outline"
            label="Category"
            value={
              player.category_name ||
              "Not assigned"
            }
          />

          <InfoRow
            icon="checkmark-circle-outline"
            label="Status"
            value={
              player.status
            }
            valueColor={
              player.status ===
              "ACTIVE"
                ? colors.present
                : colors.primary
            }
          />
        </View>

        {/* ==================================================== */}
        {/* ACADEMY STATUS */}
        {/* ==================================================== */}

        {canEditPlayers(user) && (
          <View
            style={styles.section}
          >
            <SectionTitle
              icon="shield-checkmark-outline"
              title="Academy Status"
            />

            <View
              style={
                styles.statusCard
              }
            >
              <View
                style={
                  styles.statusLeft
                }
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        player.status ===
                        "ACTIVE"
                          ? "#22C55E"
                          : "#9CA3AF",
                    },
                  ]}
                />

                <View>
                  <Text
                    style={
                      styles.statusLabel
                    }
                  >
                    Player Status
                  </Text>

                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color:
                          player.status ===
                          "ACTIVE"
                            ? "#22C55E"
                            : "#9CA3AF",
                      },
                    ]}
                  >
                    {player.status ===
                    "ACTIVE"
                      ? "Active"
                      : "Inactive"}
                  </Text>
                </View>
              </View>
            </View>

            {player.status ===
            "ACTIVE" ? (
              <TouchableOpacity
                style={
                  styles.deactivatePlayerButton
                }
                onPress={() =>
                  openStatusAction(
                    "DEACTIVATE"
                  )
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name="pause-circle-outline"
                  size={20}
                  color="#D97706"
                />

                <Text
                  style={
                    styles.deactivatePlayerText
                  }
                >
                  Deactivate Player
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={
                    styles.activatePlayerButton
                  }
                  onPress={() =>
                    openStatusAction(
                      "ACTIVATE"
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#16A34A"
                  />

                  <Text
                    style={
                      styles.activatePlayerText
                    }
                  >
                    Activate Player
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.deletePlayerButton
                  }
                  onPress={() =>
                    openStatusAction(
                      "DELETE"
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#EF4444"
                  />

                  <Text
                    style={
                      styles.deletePlayerText
                    }
                  >
                    Delete Permanently
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* SCHOOL DETAILS */}
        {/* ==================================================== */}

        <View
          style={styles.section}
        >
          <SectionTitle
            icon="school-outline"
            title="School Details"
          />

          <InfoRow
            icon="school-outline"
            label="School"
            value={
              player.school ||
              "Not added"
            }
          />

          <InfoRow
            icon="book-outline"
            label="Standard"
            value={
              player.standard ||
              "Not added"
            }
          />
        </View>

        {/* ==================================================== */}
        {/* CONTACT DETAILS */}
        {/* ==================================================== */}

        <View
          style={styles.section}
        >
          <SectionTitle
            icon="call-outline"
            title="Contact Details"
          />

          <InfoRow
            icon="call-outline"
            label="Phone 1"
            value={
              player.phone_1 ||
              "Not added"
            }
          />

          <InfoRow
            icon="call-outline"
            label="Phone 2"
            value={
              player.phone_2 ||
              "Not added"
            }
          />

          <InfoRow
            icon="person-circle-outline"
            label="Pickup Person"
            value={
              player.pickup_person ||
              "Not added"
            }
          />
        </View>

        {/* ==================================================== */}
        {/* HEALTH */}
        {/* ==================================================== */}

        <View
          style={styles.section}
        >
          <SectionTitle
            icon="medkit-outline"
            title="Health"
          />

          <View
            style={
              styles.healthBox
            }
          >
            <Text
              style={
                styles.healthText
              }
            >
              {
                player.health_condition ||
                "No health condition added"
              }
            </Text>
          </View>
        </View>

        {/* ==================================================== */}
        {/* ATTENDANCE SUMMARY */}
        {/* ==================================================== */}

        <View
          style={styles.section}
        >
          <SectionTitle
            icon="calendar-outline"
            title="Attendance"
          />

          <View
            style={
              styles.attendanceCards
            }
          >
            <StatCard
              icon="calendar-outline"
              value={String(
                summary.total_days
              )}
              label="Total Days"
            />

            <StatCard
              icon="checkmark-circle-outline"
              value={String(
                summary.present
              )}
              label="Present"
              valueColor={
                colors.present
              }
            />

            <StatCard
              icon="close-circle-outline"
              value={String(
                summary.absent
              )}
              label="Absent"
              valueColor={
                colors.primary
              }
            />
          </View>

          <View
            style={
              styles.percentageBox
            }
          >
            <View
              style={
                styles.percentageHeader
              }
            >
              <Text
                style={
                  styles.percentageLabel
                }
              >
                Attendance Percentage
              </Text>

              <Text
                style={
                  styles.percentageValue
                }
              >
                {
                  summary.attendance_percentage
                }%
              </Text>
            </View>

            <View
              style={
                styles.progressBackground
              }
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        summary.attendance_percentage
                      )
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* ==================================================== */}
        {/* RECENT ATTENDANCE */}
        {/* ==================================================== */}

        <View
          style={styles.section}
        >
          <SectionTitle
            icon="time-outline"
            title="Recent Attendance"
          />

          {attendanceHistory.length ===
          0 ? (
            <Text
              style={
                styles.emptyText
              }
            >
              No attendance records found.
            </Text>
          ) : (
            <View
              style={
                styles.historyCard
              }
            >
              {attendanceHistory
                .slice(0, 15)
                .map(
                  (record: any) => (
                    <AttendanceRow
                      key={record.id}
                      record={record}
                    />
                  )
                )}
            </View>
          )}
        </View>

        {/* ==================================================== */}
        {/* FEE HISTORY */}
        {/* ==================================================== */}

        <View
          style={styles.section}
        >
          <SectionTitle
            icon="cash-outline"
            title="Fee History"
          />

          {fees.length === 0 ? (
            <Text
              style={
                styles.emptyText
              }
            >
              No fee records found.
            </Text>
          ) : (
            <View
              style={
                styles.feeCard
              }
            >
              {fees.map(
                (fee: any) => (
                  <FeeRow
                    key={fee.id}
                    fee={fee}
                  />
                )
              )}
            </View>
          )}
        </View>

        <View
          style={{ height: 50 }}
        />

      </ScrollView>

      {/* ====================================================== */}
      {/* PROFILE PHOTO VIEWER */}
      {/* ====================================================== */}

      <Modal
        visible={
          showPhotoViewer
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowPhotoViewer(false)
        }
      >
        <Pressable
          style={
            styles.photoViewerOverlay
          }
          onPress={() =>
            setShowPhotoViewer(false)
          }
        >

          {/* CLOSE BUTTON */}

          <TouchableOpacity
            style={
              styles.photoViewerClose
            }
            onPress={() =>
              setShowPhotoViewer(false)
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="close"
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* BIG CIRCLE */}

          <View
            style={
              styles.photoViewerCircle
            }
          >
            {profilePhotoUrl ? (
              <Image
                source={{
                  uri: profilePhotoUrl,
                }}
                style={
                  styles.photoViewerImage
                }
                resizeMode="cover"
              />
            ) : (
              <View
                style={
                  styles.photoViewerPlaceholder
                }
              >
                <Ionicons
                  name="person"
                  size={100}
                  color={
                    colors.textMuted
                  }
                />
              </View>
            )}
          </View>

          <Text
            style={
              styles.photoViewerName
            }
          >
            {player.player_name}
          </Text>

          <Text
            style={
              styles.photoViewerHint
            }
          >
            Tap outside to close
          </Text>

        </Pressable>
      </Modal>

      {/* ====================================================== */}
      {/* STATUS CONFIRMATION MODAL */}
      {/* ====================================================== */}

      <Modal
        visible={
          showStatusModal
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeStatusModal
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalContainer
            }
          >
            <View
              style={[
                styles.modalIcon,
                statusAction ===
                  "DELETE" &&
                  styles.modalDangerIcon,
              ]}
            >
              <Ionicons
                name={
                  statusAction ===
                  "DELETE"
                    ? "trash-outline"
                    : statusAction ===
                      "ACTIVATE"
                    ? "checkmark-circle-outline"
                    : "pause-circle-outline"
                }
                size={28}
                color={
                  statusAction ===
                  "DELETE"
                    ? "#EF4444"
                    : statusAction ===
                      "ACTIVATE"
                    ? "#16A34A"
                    : "#D97706"
                }
              />
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              {statusAction ===
              "DELETE"
                ? "Delete Player Permanently?"
                : statusAction ===
                  "ACTIVATE"
                ? "Activate Player?"
                : "Deactivate Player?"}
            </Text>

            <Text
              style={
                styles.modalPlayerName
              }
            >
              {player.player_name}
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              {statusAction ===
              "DELETE"
                ? "This player and related records will be permanently deleted. This action cannot be undone."
                : statusAction ===
                  "ACTIVATE"
                ? "This player will become active again and appear in the Active Players list."
                : "This player will be moved to the Inactive Players list. You can activate the player again later."}
            </Text>

            <View
              style={
                styles.modalButtons
              }
            >
              <TouchableOpacity
                style={
                  styles.modalCancelButton
                }
                onPress={
                  closeStatusModal
                }
                disabled={
                  actionLoading
                }
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,

                  statusAction ===
                  "DELETE"
                    ? styles.modalDeleteButton
                    : statusAction ===
                      "ACTIVATE"
                    ? styles.modalActivateButton
                    : styles.modalDeactivateButton,
                ]}
                onPress={
                  executeStatusAction
                }
                disabled={
                  actionLoading
                }
              >
                {actionLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.modalConfirmText
                    }
                  >
                    {statusAction ===
                    "DELETE"
                      ? "Delete Permanently"
                      : statusAction ===
                        "ACTIVATE"
                      ? "Activate"
                      : "Deactivate"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

/* ============================================================ */
/* SECTION TITLE */
/* ============================================================ */

function SectionTitle({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View
      style={
        styles.sectionTitle
      }
    >
      <View
        style={
          styles.sectionIcon
        }
      >
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <Text
        style={
          styles.sectionTitleText
        }
      >
        {title}
      </Text>
    </View>
  );
}

/* ============================================================ */
/* INFO ROW */
/* ============================================================ */

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
    <View
      style={
        styles.infoRow
      }
    >
      <View
        style={
          styles.infoIcon
        }
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            colors.textSecondary
          }
        />
      </View>

      <View
        style={
          styles.infoContent
        }
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            valueColor
              ? {
                  color:
                    valueColor,
                }
              : null,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================ */
/* STAT CARD */
/* ============================================================ */

function StatCard({
  icon,
  value,
  label,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <View
      style={
        styles.statCard
      }
    >
      <Ionicons
        name={icon}
        size={21}
        color={
          valueColor ||
          colors.textSecondary
        }
      />

      <Text
        style={[
          styles.statValue,
          valueColor
            ? {
                color:
                  valueColor,
              }
            : null,
        ]}
      >
        {value}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/* ============================================================ */
/* ATTENDANCE ROW */
/* ============================================================ */

function AttendanceRow({
  record,
}: {
  record: any;
}) {
  const isPresent =
    record.status === "PRESENT";

  return (
    <View
      style={
        styles.attendanceRow
      }
    >
      <View
        style={
          styles.dateContainer
        }
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={
            colors.textSecondary
          }
        />

        <Text
          style={
            styles.dateText
          }
        >
          {record.date}
        </Text>
      </View>

      <View
        style={[
          styles.attendanceBadge,
          {
            backgroundColor:
              isPresent
                ? colors.presentSoft
                : colors.absentSoft,
          },
        ]}
      >
        <Ionicons
          name={
            isPresent
              ? "checkmark"
              : "close"
          }
          size={14}
          color={
            isPresent
              ? colors.present
              : colors.primary
          }
        />

        <Text
          style={[
            styles.attendanceBadgeText,
            {
              color:
                isPresent
                  ? colors.present
                  : colors.primary,
            },
          ]}
        >
          {record.status}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================ */
/* FEE ROW */
/* ============================================================ */

function FeeRow({
  fee,
}: {
  fee: any;
}) {
  const month =
    fee.month ||
    fee.fee_month ||
    fee.description ||
    "Fee";

  const paymentDate =
    fee.payment_date ||
    fee.paid_date ||
    fee.created_at ||
    "";

  const amount =
    fee.amount ??
    fee.paid_amount ??
    0;

  const status =
    fee.status ||
    "PENDING";

  return (
    <View
      style={
        styles.feeRow
      }
    >
      <View
        style={
          styles.feeLeft
        }
      >
        <Text
          style={
            styles.feeMonth
          }
        >
          {month}
        </Text>

        <Text
          style={
            styles.feeDate
          }
        >
          {paymentDate}
        </Text>
      </View>

      <View
        style={
          styles.feeRight
        }
      >
        <Text
          style={
            styles.feeAmount
          }
        >
          ₹{amount}
        </Text>

        <Text
          style={[
            styles.feeStatus,
            {
              color:
                status === "PAID"
                  ? colors.present
                  : colors.warning,
            },
          ]}
        >
          {status}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================ */
/* STYLES */
/* ============================================================ */

const styles =
  StyleSheet.create({

    scrollContent: {
      paddingHorizontal:
        spacing.lg,
      paddingBottom:
        spacing.xl,
    },

    /* -------------------------------------------------------- */
    /* PROFILE PHOTO */
    /* -------------------------------------------------------- */

    photoSection: {
      alignItems: "center",
      marginTop: spacing.lg,
      marginBottom:
        spacing.xl,
    },

    photoWrapper: {
      width: 155,
      height: 155,
      position: "relative",
    },

    /*
     * IMPORTANT:
     * This wrapper clips the actual image into
     * a perfect circle.
     */

    profileCircle: {
      width: 155,
      height: 155,
      borderRadius: 77.5,
      overflow: "hidden",

      backgroundColor:
        colors.card,

      borderWidth: 1,
      borderColor:
        colors.cardBorder,

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    profilePhoto: {
      width: "100%",
      height: "100%",
      borderRadius: 77.5,
    },

    profilePlaceholder: {
      width: "100%",
      height: "100%",
      borderRadius: 77.5,

      backgroundColor:
        colors.card,

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    /* -------------------------------------------------------- */
    /* CAMERA BUTTON */
    /* -------------------------------------------------------- */

    photoEditButton: {
      position: "absolute",

      right: -8,
      bottom: -7,

      width: 60,
      height: 60,

      borderRadius: 30,

      backgroundColor:
        "#22C55E",

      justifyContent:
        "center",

      alignItems:
        "center",

      borderWidth: 4,
      borderColor:
        colors.bg,

      elevation: 7,

      shadowColor: "#000",

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.3,
      shadowRadius: 5,
    },

    changePhotoText: {
      marginTop:
        spacing.md,

      color:
        colors.textSecondary,

      fontSize: 13,

      fontWeight: "500",
    },

    /* ======================================================== */
    /* PHOTO VIEWER */
    /* ======================================================== */

    photoViewerOverlay: {
      flex: 1,

      backgroundColor:
        "rgba(0,0,0,0.94)",

      justifyContent:
        "center",

      alignItems:
        "center",

      paddingHorizontal: 20,
    },

    photoViewerCircle: {
      width: 310,
      height: 310,

      borderRadius: 155,

      overflow: "hidden",

      backgroundColor:
        colors.card,

      borderWidth: 3,
      borderColor: "#FFFFFF",

      justifyContent:
        "center",

      alignItems:
        "center",

      elevation: 15,

      shadowColor: "#000",

      shadowOffset: {
        width: 0,
        height: 8,
      },

      shadowOpacity: 0.5,

      shadowRadius: 15,
    },

    photoViewerImage: {
      width: "100%",
      height: "100%",
      borderRadius: 155,
    },

    photoViewerPlaceholder: {
      width: "100%",
      height: "100%",

      borderRadius: 155,

      backgroundColor:
        colors.card,

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    photoViewerClose: {
      position: "absolute",

      top: 50,
      right: 20,

      width: 52,
      height: 52,

      borderRadius: 26,

      backgroundColor:
        "rgba(255,255,255,0.16)",

      justifyContent:
        "center",

      alignItems:
        "center",

      zIndex: 10,
    },

    photoViewerName: {
      marginTop: 25,

      color: "#FFFFFF",

      fontSize: 21,

      fontWeight: "800",

      textAlign: "center",
    },

    photoViewerHint: {
      marginTop: 8,

      color:
        "rgba(255,255,255,0.65)",

      fontSize: 13,

      textAlign: "center",
    },

    /* -------------------------------------------------------- */
    /* SECTION */
    /* -------------------------------------------------------- */

    section: {
      marginBottom:
        spacing.xl,
    },

    sectionTitle: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom:
        spacing.md,
    },

    sectionIcon: {
      width: 38,
      height: 38,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.primarySoft,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginRight:
        spacing.sm,
    },

    sectionTitleText: {
      color:
        colors.textPrimary,

      fontSize: 18,

      fontWeight: "700",
    },

    /* -------------------------------------------------------- */
    /* INFO */
    /* -------------------------------------------------------- */

    infoRow: {
      flexDirection: "row",

      alignItems:
        "center",

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      borderRadius:
        radius.md,

      padding:
        spacing.md,

      marginBottom:
        spacing.sm,
    },

    infoIcon: {
      width: 35,

      alignItems:
        "center",

      marginRight:
        spacing.sm,
    },

    infoContent: {
      flex: 1,
    },

    infoLabel: {
      color:
        colors.textMuted,

      fontSize: 12,

      marginBottom: 3,
    },

    infoValue: {
      color:
        colors.textPrimary,

      fontSize: 15,

      fontWeight: "600",
    },

    /* -------------------------------------------------------- */
    /* HEALTH */
    /* -------------------------------------------------------- */

    healthBox: {
      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      borderRadius:
        radius.md,

      padding:
        spacing.md,
    },

    healthText: {
      color:
        colors.textSecondary,

      fontSize: 14,

      lineHeight: 21,
    },

    /* -------------------------------------------------------- */
    /* ATTENDANCE */
    /* -------------------------------------------------------- */

    attendanceCards: {
      flexDirection:
        "row",

      gap: spacing.sm,
    },

    statCard: {
      flex: 1,

      minHeight: 100,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      borderRadius:
        radius.md,

      justifyContent:
        "center",

      alignItems:
        "center",

      padding:
        spacing.sm,
    },

    statValue: {
      color:
        colors.textPrimary,

      fontSize: 22,

      fontWeight: "800",

      marginTop: 7,
    },

    statLabel: {
      color:
        colors.textMuted,

      fontSize: 11,

      marginTop: 3,

      textAlign:
        "center",
    },

    percentageBox: {
      marginTop:
        spacing.sm,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      borderRadius:
        radius.md,

      padding:
        spacing.md,
    },

    percentageHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginBottom:
        spacing.sm,
    },

    percentageLabel: {
      color:
        colors.textSecondary,

      fontSize: 13,
    },

    percentageValue: {
      color:
        colors.textPrimary,

      fontSize: 16,

      fontWeight: "800",
    },

    progressBackground: {
      height: 8,

      backgroundColor:
        colors.bg,

      borderRadius: 4,

      overflow: "hidden",
    },

    progressFill: {
      height: "100%",

      backgroundColor:
        colors.present,

      borderRadius: 4,
    },

    /* -------------------------------------------------------- */
    /* ATTENDANCE HISTORY */
    /* -------------------------------------------------------- */

    historyCard: {
      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      borderRadius:
        radius.md,

      paddingHorizontal:
        spacing.md,
    },

    attendanceRow: {
      minHeight: 55,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      borderBottomWidth: 1,

      borderBottomColor:
        colors.cardBorder,
    },

    dateContainer: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,
    },

    dateText: {
      color:
        colors.textSecondary,

      fontSize: 13,
    },

    attendanceBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      paddingHorizontal: 9,

      paddingVertical: 5,

      borderRadius: 12,
    },

    attendanceBadgeText: {
      fontSize: 11,

      fontWeight: "700",
    },

    /* -------------------------------------------------------- */
    /* FEES */
    /* -------------------------------------------------------- */

    feeCard: {
      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      borderRadius:
        radius.md,

      paddingHorizontal:
        spacing.md,
    },

    feeRow: {
      minHeight: 65,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      borderBottomWidth: 1,

      borderBottomColor:
        colors.cardBorder,
    },

    feeLeft: {
      flex: 1,
    },

    feeMonth: {
      color:
        colors.textPrimary,

      fontSize: 14,

      fontWeight: "600",
    },

    feeDate: {
      color:
        colors.textMuted,

      fontSize: 11,

      marginTop: 3,
    },

    feeRight: {
      alignItems:
        "flex-end",
    },

    feeAmount: {
      color:
        colors.textPrimary,

      fontSize: 15,

      fontWeight: "700",
    },

    feeStatus: {
      fontSize: 11,

      fontWeight: "700",

      marginTop: 2,
    },

    emptyText: {
      color:
        colors.textMuted,

      fontSize: 13,

      textAlign:
        "center",

      paddingVertical:
        spacing.lg,
    },

    /* -------------------------------------------------------- */
    /* PLAYER STATUS */
    /* -------------------------------------------------------- */

    statusCard: {
      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      borderRadius:
        radius.md,

      padding:
        spacing.md,

      marginBottom:
        spacing.sm,
    },

    statusLeft: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    statusDot: {
      width: 12,
      height: 12,

      borderRadius: 6,

      marginRight:
        spacing.sm,
    },

    statusLabel: {
      color:
        colors.textMuted,

      fontSize: 12,

      marginBottom: 3,
    },

    statusValue: {
      fontSize: 15,

      fontWeight: "800",
    },

    deactivatePlayerButton: {
      minHeight: 50,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor: "#F59E0B",

      backgroundColor:
        "#FFF7ED",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      marginTop:
        spacing.sm,
    },

    deactivatePlayerText: {
      color:
        "#D97706",

      fontSize: 14,

      fontWeight: "700",
    },

    activatePlayerButton: {
      minHeight: 50,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        "#22C55E",

      backgroundColor:
        "#F0FDF4",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      marginTop:
        spacing.sm,
    },

    activatePlayerText: {
      color:
        "#16A34A",

      fontSize: 14,

      fontWeight: "700",
    },

    deletePlayerButton: {
      minHeight: 50,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        "#EF4444",

      backgroundColor:
        "#FEF2F2",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      marginTop:
        spacing.sm,
    },

    deletePlayerText: {
      color:
        "#EF4444",

      fontSize: 14,

      fontWeight: "700",
    },

    /* -------------------------------------------------------- */
    /* STATUS MODAL */
    /* -------------------------------------------------------- */

    modalOverlay: {
      flex: 1,

      backgroundColor:
        "rgba(0,0,0,0.60)",

      justifyContent:
        "center",

      alignItems:
        "center",

      paddingHorizontal: 20,
    },

    modalContainer: {
      width: "100%",

      maxWidth: 420,

      backgroundColor:
        colors.card,

      borderRadius: 20,

      padding: 22,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,
    },

    modalIcon: {
      width: 58,
      height: 58,

      borderRadius: 29,

      backgroundColor:
        "#FFF7ED",

      alignItems:
        "center",

      justifyContent:
        "center",

      alignSelf:
        "center",

      marginBottom: 14,
    },

    modalDangerIcon: {
      backgroundColor:
        "#FEF2F2",
    },

    modalTitle: {
      color:
        colors.textPrimary,

      fontSize: 20,

      fontWeight: "800",

      textAlign:
        "center",

      marginBottom: 8,
    },

    modalPlayerName: {
      color:
        colors.primary,

      fontSize: 16,

      fontWeight: "700",

      textAlign:
        "center",

      marginBottom: 12,
    },

    modalMessage: {
      color:
        colors.textSecondary,

      fontSize: 14,

      lineHeight: 21,

      textAlign:
        "center",

      marginBottom: 22,
    },

    modalButtons: {
      flexDirection:
        "row",

      gap: 10,
    },

    modalCancelButton: {
      flex: 1,

      minHeight: 48,

      borderRadius: 11,

      backgroundColor:
        colors.bg,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    modalCancelText: {
      color:
        colors.textSecondary,

      fontSize: 14,

      fontWeight: "700",
    },

    modalConfirmButton: {
      flex: 1,

      minHeight: 48,

      borderRadius: 11,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    modalDeactivateButton: {
      backgroundColor:
        "#D97706",
    },

    modalActivateButton: {
      backgroundColor:
        "#16A34A",
    },

    modalDeleteButton: {
      backgroundColor:
        "#EF4444",
    },

    modalConfirmText: {
      color: "#FFFFFF",

      fontSize: 14,

      fontWeight: "700",

      textAlign:
        "center",
    },
  });