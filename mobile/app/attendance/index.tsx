import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";

import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { api, apiErrorMessage } from "@/services/api";

import {
  colors,
  spacing,
  radius,
  typography,
} from "@/constants/theme";

// ==================================================
// TYPES
// ==================================================

type Category = {
  id: number;
  name: string;
};

type Player = {
  id: number;
  player_id: string;
  player_name: string;
  profile_photo?: string | null;
  status?: string;
  category_id?: number;
  category_name?: string;
};

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "UNMARKED";

// ==================================================
// API SERVER URL
// ==================================================

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  "http://localhost:5000/api";

const API_SERVER_URL = API_BASE_URL.replace(
  /\/api\/?$/,
  ""
);

// ==================================================
// PHOTO URL
// ==================================================

function getPlayerPhotoUrl(
  photo?: string | null
) {
  if (!photo) return null;

  const value = String(photo).trim();

  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_SERVER_URL}${value}`;
  }

  return `${API_SERVER_URL}/${value}`;
}

// ==================================================
// CATEGORY ORDER
// ==================================================

const CATEGORY_ORDER = [
  "coaches",
  "basic 1",
  "basic 2",
  "keeper",
  "u7",
  "u9",
  "u11",
  "u13",
  "u15",
];

// ==================================================
// SCREEN
// ==================================================

export default function AttendanceScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const authUser = user as any;

  // ==================================================
  // ROLE
  // ==================================================

  const roleValue =
    authUser?.role ??
    authUser?.user?.role ??
    authUser?.data?.role ??
    "";

  const admin =
    String(roleValue).toUpperCase() === "ADMIN";

  // ==================================================
  // COACH CATEGORY
  // ==================================================

  const coachCategoryId = useMemo(() => {
    const value =
      authUser?.category_id ??
      authUser?.coach?.category_id ??
      null;

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const numberValue = Number(value);

    return Number.isNaN(numberValue)
      ? null
      : numberValue;
  }, [
    authUser?.category_id,
    authUser?.coach?.category_id,
  ]);

  // ==================================================
  // STATES
  // ==================================================

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number | null>(null);

  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [attendance, setAttendance] =
    useState<
      Record<number, AttendanceStatus>
    >({});

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [loadingAttendance, setLoadingAttendance] =
    useState(false);

  const [error, setError] = useState("");

  // ==================================================
  // PHOTO PREVIEW
  // ==================================================

  const [previewPhoto, setPreviewPhoto] =
    useState<string | null>(null);

  const [previewPlayerName, setPreviewPlayerName] =
    useState("");

  const [previewPlayerId, setPreviewPlayerId] =
    useState("");

  // ==================================================
  // ADD PLAYER
  // ==================================================

  const [newPlayerName, setNewPlayerName] =
    useState("");

  const [addingPlayer, setAddingPlayer] =
    useState(false);

  const [showAddPlayer, setShowAddPlayer] =
    useState(false);

  // ==================================================
  // DELETE PLAYER
  // ==================================================

  const [deletingPlayerId, setDeletingPlayerId] =
    useState<number | null>(null);

  // ==================================================
  // MESSAGE
  // ==================================================

  const showMessage = (
    title: string,
    message: string
  ) => {
    if (Platform.OS === "web") {
      window.alert(
        `${title}\n\n${message}`
      );
      return;
    }

    Alert.alert(
      title,
      message
    );
  };

  // ==================================================
  // OPEN PLAYER PROFILE
  // ==================================================

  const openPlayerProfile = (
    playerId: number
  ) => {
    router.push(
      `/players/${playerId}` as any
    );
  };

  // ==================================================
  // OPEN LARGE PHOTO
  // ==================================================

  const openPlayerPhoto = (
    player: Player
  ) => {
    const photoUrl =
      getPlayerPhotoUrl(
        player.profile_photo
      );

    if (!photoUrl) {
      return;
    }

    setPreviewPlayerName(
      player.player_name
    );

    setPreviewPlayerId(
      player.player_id
    );

    setPreviewPhoto(photoUrl);
  };

  // ==================================================
  // CLOSE PHOTO
  // ==================================================

  const closePhoto = () => {
    setPreviewPhoto(null);
    setPreviewPlayerName("");
    setPreviewPlayerId("");
  };

  // ==================================================
  // LOAD CATEGORIES
  // ==================================================

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        setError("");

        const response =
          await api.get(
            "/categories",
            {
              params: {
                active_only: true,
              },
            }
          );

        const raw = response.data;

        const list: any[] =
          Array.isArray(raw)
            ? raw
            : Array.isArray(
                raw?.categories
              )
            ? raw.categories
            : Array.isArray(
                raw?.data
              )
            ? raw.data
            : [];

        let mappedCategories: Category[] =
          list
            .map((item: any) => ({
              id: Number(item.id),
              name: String(
                item.name ?? ""
              ).trim(),
            }))
            .filter(
              (item: Category) =>
                Number.isFinite(item.id) &&
                item.name !== ""
            );

        mappedCategories.sort(
          (a, b) => {
            const aIndex =
              CATEGORY_ORDER.indexOf(
                a.name.toLowerCase()
              );

            const bIndex =
              CATEGORY_ORDER.indexOf(
                b.name.toLowerCase()
              );

            const safeA =
              aIndex === -1
                ? CATEGORY_ORDER.length
                : aIndex;

            const safeB =
              bIndex === -1
                ? CATEGORY_ORDER.length
                : bIndex;

            return safeA - safeB;
          }
        );

        if (!mounted) return;

        setCategories(
          mappedCategories
        );

        setSelectedCategoryId(
          (current) => {
            const exists =
              current !== null &&
              mappedCategories.some(
                (category) =>
                  Number(category.id) ===
                  Number(current)
              );

            if (exists) {
              return current;
            }

            if (
              !admin &&
              coachCategoryId !== null
            ) {
              const assigned =
                mappedCategories.find(
                  (category) =>
                    Number(category.id) ===
                    Number(coachCategoryId)
                );

              return assigned?.id ?? null;
            }

            return mappedCategories.length > 0
              ? mappedCategories[0].id
              : null;
          }
        );
      } catch (err) {
        if (mounted) {
          setError(
            apiErrorMessage(
              err,
              "Unable to load categories"
            )
          );
        }
      } finally {
        if (mounted) {
          setLoadingCategories(false);
        }
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, [
    admin,
    coachCategoryId,
  ]);

  // ==================================================
  // PERMISSION
  // ==================================================
  //
  // Any authenticated user (coach or admin) can VIEW every
  // category's attendance. Only admins, or the coach whose
  // assigned category matches the one currently selected,
  // can MARK/EDIT attendance for that category. This is the
  // single source of truth for "can I edit" -- the category
  // selector itself is never disabled, so switching categories
  // to look at them is always allowed; only the write actions
  // (mark player, mark all, reset, add/delete player) check
  // this flag.
  // ==================================================

  const canManageCategory =
    admin ||
    (
      coachCategoryId !== null &&
      selectedCategoryId !== null &&
      Number(coachCategoryId) ===
        Number(selectedCategoryId)
    );

  // ==================================================
  // LOAD ATTENDANCE
  // ==================================================

  const loadAttendance =
    useCallback(
      async () => {
        if (
          selectedCategoryId === null
        ) {
          setPlayers([]);
          setAttendance({});
          return;
        }

        try {
          setLoadingAttendance(true);
          setError("");

          const [
            attendanceResponse,
            playersResponse,
          ] = await Promise.all([
            api.get(
              "/attendance",
              {
                params: {
                  date: selectedDate,
                  category_id:
                    selectedCategoryId,
                },
              }
            ),

            api.get(
              "/players",
              {
                params: {
                  category_id:
                    selectedCategoryId,
                  status: "ACTIVE",
                  per_page: 200,
                },
              }
            ),
          ]);

          const raw =
            attendanceResponse.data;

          const playersRaw =
            playersResponse.data;

          // ==================================================
          // PLAYER PROFILE PHOTOS
          // ==================================================

          const profileList: any[] =
            Array.isArray(playersRaw)
              ? playersRaw
              : Array.isArray(
                  playersRaw?.players
                )
              ? playersRaw.players
              : Array.isArray(
                  playersRaw?.data
                )
              ? playersRaw.data
              : [];

          const profilePhotoMap =
            new Map<
              number,
              string | null
            >();

          profileList.forEach(
            (profile: any) => {
              const profileId =
                Number(profile.id);

              if (
                Number.isFinite(
                  profileId
                )
              ) {
                profilePhotoMap.set(
                  profileId,
                  profile.profile_photo ??
                    null
                );
              }
            }
          );

          // ==================================================
          // ATTENDANCE LIST
          // ==================================================

          let list: any[] = [];

          if (Array.isArray(raw)) {
            list = raw;
          } else if (
            Array.isArray(
              raw?.attendance
            )
          ) {
            list = raw.attendance;
          } else if (
            Array.isArray(
              raw?.players
            )
          ) {
            list = raw.players;
          } else if (
            Array.isArray(
              raw?.data
            )
          ) {
            list = raw.data;
          }

          const loadedPlayers: Player[] =
            [];

          const loadedAttendance: Record<
            number,
            AttendanceStatus
          > = {};

          list.forEach(
            (item: any) => {
              const playerData =
                item.player ??
                item;

              const id = Number(
                playerData.id ??
                  item.player_id ??
                  item.id
              );

              if (
                !Number.isFinite(id)
              ) {
                return;
              }

              const playerName =
                String(
                  playerData.player_name ??
                    playerData.name ??
                    item.player_name ??
                    item.name ??
                    ""
                ).trim();

              if (!playerName) {
                return;
              }

              const player: Player = {
                id,

                player_id:
                  String(
                    playerData.player_id ??
                      item.player_id ??
                      `P${id}`
                  ),

                player_name:
                  playerName,

                profile_photo:
                  playerData.profile_photo ??
                  item.profile_photo ??
                  profilePhotoMap.get(id) ??
                  null,

                status:
                  playerData.status ??
                  item.player_status ??
                  "ACTIVE",

                category_id:
                  playerData.category_id ??
                  selectedCategoryId,

                category_name:
                  playerData.category_name ??
                  item.category_name ??
                  undefined,
              };

              loadedPlayers.push(player);

              const rawStatus =
                item.attendance_status ??
                item.attendance_status_value ??
                item.status ??
                item.attendance ??
                "UNMARKED";

              const normalized =
                String(
                  rawStatus
                ).toUpperCase();

              if (
                normalized ===
                "PRESENT"
              ) {
                loadedAttendance[id] =
                  "PRESENT";
              } else if (
                normalized ===
                "ABSENT"
              ) {
                loadedAttendance[id] =
                  "ABSENT";
              } else {
                loadedAttendance[id] =
                  "UNMARKED";
              }
            }
          );

          // ==================================================
          // REMOVE DUPLICATES
          // ==================================================

          const uniquePlayers =
            Array.from(
              new Map(
                loadedPlayers.map(
                  (player) => [
                    player.id,
                    player,
                  ]
                )
              ).values()
            );

          // ==================================================
          // SORT
          // ==================================================

          uniquePlayers.sort(
            (a, b) =>
              a.player_name.localeCompare(
                b.player_name
              )
          );

          setPlayers(
            uniquePlayers
          );

          setAttendance(
            loadedAttendance
          );
        } catch (err) {
          setPlayers([]);
          setAttendance({});

          setError(
            apiErrorMessage(
              err,
              "Unable to load attendance"
            )
          );
        } finally {
          setLoadingAttendance(false);
        }
      },
      [
        selectedCategoryId,
        selectedDate,
      ]
    );

  useEffect(() => {
    loadAttendance();
  }, [
    loadAttendance,
  ]);

  // ==================================================
  // COUNTS
  // ==================================================

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unmarked = 0;

    players.forEach(
      (player) => {
        const status =
          attendance[player.id] ??
          "UNMARKED";

        if (
          status === "PRESENT"
        ) {
          present++;
        } else if (
          status === "ABSENT"
        ) {
          absent++;
        } else {
          unmarked++;
        }
      }
    );

    return {
      present,
      absent,
      unmarked,
      total: players.length,
    };
  }, [
    players,
    attendance,
  ]);

  // ==================================================
  // SAVE ATTENDANCE
  // ==================================================

  const saveAttendance =
    async (
      attendanceData?: Record<
        number,
        AttendanceStatus
      >
    ) => {
      if (
        selectedCategoryId === null
      ) {
        return;
      }

      const dataToSave =
        attendanceData ??
        attendance;

      try {
        setError("");

        const records =
          players.map(
            (player) => ({
              player_id:
                player.id,

              category_id:
                selectedCategoryId,

              status:
                dataToSave[player.id] ??
                "UNMARKED",
            })
          );

        await api.post(
          "/attendance",
          {
            date: selectedDate,

            category_id:
              selectedCategoryId,

            records,
          }
        );
      } catch (err) {
        setError(
          apiErrorMessage(
            err,
            "Unable to auto-save attendance"
          )
        );
      }
    };

  // ==================================================
  // MARK PLAYER
  // ==================================================

  const markPlayer = (
    playerId: number,
    status: AttendanceStatus
  ) => {
    if (!canManageCategory) {
      return;
    }

    const updated = {
      ...attendance,
      [playerId]: status,
    };

    setAttendance(updated);

    void saveAttendance(updated);
  };

  // ==================================================
  // MARK ALL
  // ==================================================

  const markAll = (
    status:
      | "PRESENT"
      | "ABSENT"
  ) => {
    if (!canManageCategory) {
      return;
    }

    const updated: Record<
      number,
      AttendanceStatus
    > = {};

    players.forEach(
      (player) => {
        updated[player.id] =
          status;
      }
    );

    setAttendance(updated);

    void saveAttendance(updated);
  };

  // ==================================================
  // RESET
  // ==================================================

  const resetAttendance = () => {
    if (!canManageCategory) {
      return;
    }

    const updated: Record<
      number,
      AttendanceStatus
    > = {};

    players.forEach(
      (player) => {
        updated[player.id] =
          "UNMARKED";
      }
    );

    setAttendance(updated);

    void saveAttendance(updated);
  };

  // ==================================================
  // ADD PLAYER
  // ==================================================

  const addPlayer = async () => {
    if (!canManageCategory) {
      showMessage(
        "Permission denied",
        "You can only add players to your assigned category."
      );
      return;
    }

    if (
      selectedCategoryId === null
    ) {
      showMessage(
        "Category required",
        "Please select a category."
      );
      return;
    }

    const name =
      newPlayerName.trim();

    if (!name) {
      showMessage(
        "Player name required",
        "Please enter the player name."
      );
      return;
    }

    try {
      setAddingPlayer(true);
      setError("");

      await api.post(
        "/players/quick-add",
        {
          player_name: name,
          category_id:
            selectedCategoryId,
        }
      );

      await loadAttendance();

      setNewPlayerName("");
      setShowAddPlayer(false);

      showMessage(
        "Player added",
        `${name} has been added successfully.`
      );
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Unable to add player"
        )
      );
    } finally {
      setAddingPlayer(false);
    }
  };

  // ==================================================
  // DELETE PLAYER
  // ==================================================

  const deletePlayer = (
    player: Player
  ) => {
    if (!canManageCategory) {
      showMessage(
        "Permission denied",
        "You can only delete players from your assigned category."
      );
      return;
    }

    if (
      deletingPlayerId !== null
    ) {
      return;
    }

    const performDelete =
      async () => {
        try {
          setDeletingPlayerId(
            player.id
          );

          setError("");

          await api.delete(
            `/players/${player.id}`
          );

          await loadAttendance();

          showMessage(
            "Player removed",
            `${player.player_name} has been removed.`
          );
        } catch (err) {
          setError(
            apiErrorMessage(
              err,
              "Unable to delete player"
            )
          );
        } finally {
          setDeletingPlayerId(null);
        }
      };

    if (
      Platform.OS === "web"
    ) {
      const confirmed =
        window.confirm(
          `Remove ${player.player_name} from this category?`
        );

      if (confirmed) {
        performDelete();
      }

      return;
    }

    Alert.alert(
      "Remove player",
      `Remove ${player.player_name} from this category?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress:
            performDelete,
        },
      ]
    );
  };

  // ==================================================
  // WHATSAPP
  // ==================================================

  const exportToWhatsApp =
    async () => {
      const category =
        categories.find(
          (item) =>
            Number(item.id) ===
            Number(
              selectedCategoryId
            )
        );

      const categoryName =
        category?.name ??
        "Category";

      const [
        year,
        month,
        day,
      ] = selectedDate
        .split("-")
        .map(Number);

      const dateObject =
        new Date(
          year,
          month - 1,
          day
        );

      const weekday =
        dateObject.toLocaleDateString(
          "en-IN",
          {
            weekday: "long",
          }
        );

      const shortDate =
        dateObject.toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
          }
        );

      const presentPlayers =
        players.filter(
          (player) =>
            attendance[player.id] ===
            "PRESENT"
        );

      const absentPlayers =
        players.filter(
          (player) =>
            attendance[player.id] ===
            "ABSENT"
        );

      let message = "";

      message +=
        `*PLAYMAKER FC*\n`;

      message +=
        `*${categoryName}* — Evening Session\n`;

      message +=
        `${weekday}, ${shortDate}\n`;

      message +=
        `--------------------\n\n`;

      if (
        presentPlayers.length > 0
      ) {
        message +=
          `*Present (${presentPlayers.length})*\n`;

        presentPlayers.forEach(
          (player, index) => {
            message +=
              `  ${index + 1}. ${player.player_name}\n`;
          }
        );

        message += "\n";
      }

      if (
        absentPlayers.length > 0
      ) {
        message +=
          `*Absent (${absentPlayers.length})*\n`;

        absentPlayers.forEach(
          (player, index) => {
            message +=
              `  ${index + 1}. ${player.player_name}\n`;
          }
        );

        message += "\n";
      }

      message +=
        `--------------------\n`;

      message +=
        `${presentPlayers.length}/${players.length} present`;

      try {
        const url =
          `https://wa.me/?text=${encodeURIComponent(
            message
          )}`;

        await Linking.openURL(url);
      } catch {
        showMessage(
          "WhatsApp",
          "Unable to open WhatsApp."
        );
      }
    };

  // ==================================================
  // CHANGE DATE
  // ==================================================

  const changeDate = (
    days: number
  ) => {
    const date =
      new Date(
        `${selectedDate}T00:00:00`
      );

    date.setDate(
      date.getDate() + days
    );

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    setSelectedDate(
      `${year}-${month}-${day}`
    );
  };

  // ==================================================
  // PLAYER ROW
  // ==================================================

  const renderPlayer = ({
    item,
  }: {
    item: Player;
  }) => {
    const status =
      attendance[item.id] ??
      "UNMARKED";

    const deleting =
      deletingPlayerId ===
      item.id;

    const photoUrl =
      getPlayerPhotoUrl(
        item.profile_photo
      );

    return (
      <View
        style={[
          styles.playerCard,
          status === "PRESENT" &&
            styles.playerCardPresent,
          status === "ABSENT" &&
            styles.playerCardAbsent,
        ]}
      >

        {/* ==========================================
            LEFT SIDE
            PHOTO + PLAYER DETAILS
        =========================================== */}

        <View
          style={styles.playerInfo}
        >

          {/* DP */}

          <TouchableOpacity
            style={styles.avatar}
            activeOpacity={0.8}
            disabled={!photoUrl}
            onPress={() => {
              openPlayerPhoto(item);
            }}
          >
            {photoUrl ? (
              <Image
                source={{
                  uri: photoUrl,
                }}
                style={
                  styles.avatarImage
                }
                resizeMode="cover"
                onError={(event) => {
                  console.log(
                    "ATTENDANCE DP ERROR:",
                    item.player_name,
                    photoUrl,
                    event.nativeEvent
                  );
                }}
              />
            ) : (
              <Text
                style={
                  styles.avatarText
                }
              >
                {item.player_name
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>

          {/* PLAYER NAME + ID */}

          <TouchableOpacity
            style={styles.playerDetails}
            activeOpacity={0.7}
            onPress={() => {
              openPlayerProfile(
                item.id
              );
            }}
          >
            <Text
              style={
                styles.playerName
              }
              numberOfLines={1}
            >
              {item.player_name}
            </Text>

            <Text
              style={
                styles.playerId
              }
            >
              {item.player_id}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ==========================================
            ACTION BUTTONS
        =========================================== */}

        <View
          style={
            styles.playerActions
          }
        >

          {/* PRESENT */}

          <TouchableOpacity
            style={[
              styles.statusButton,
              styles.presentButton,
              status === "PRESENT" &&
                styles.presentActive,
            ]}
            onPress={() =>
              markPlayer(
                item.id,
                "PRESENT"
              )
            }
            disabled={
              !canManageCategory
            }
          >
            <Ionicons
              name="checkmark"
              size={18}
              color={
                status === "PRESENT"
                  ? "#FFFFFF"
                  : "#16A34A"
              }
            />
          </TouchableOpacity>

          {/* ABSENT */}

          <TouchableOpacity
            style={[
              styles.statusButton,
              styles.absentButton,
              status === "ABSENT" &&
                styles.absentActive,
            ]}
            onPress={() =>
              markPlayer(
                item.id,
                "ABSENT"
              )
            }
            disabled={
              !canManageCategory
            }
          >
            <Ionicons
              name="close"
              size={18}
              color={
                status === "ABSENT"
                  ? "#FFFFFF"
                  : "#DC2626"
              }
            />
          </TouchableOpacity>

          {/* DELETE */}

          {canManageCategory &&
            showAddPlayer && (
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  deleting &&
                    styles.disabledButton,
                ]}
                disabled={deleting}
                onPress={() =>
                  deletePlayer(item)
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
        </View>
      </View>
    );
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loadingCategories) {
    return (
      <View
        style={styles.container}
      >
        <Header
          title="Attendance"
          subtitle="Football Academy"
        />

        <View
          style={
            styles.loadingContainer
          }
        >
          <Text
            style={
              styles.loadingText
            }
          >
            Loading categories...
          </Text>
        </View>
      </View>
    );
  }

  // ==================================================
  // MAIN UI
  // ==================================================

  return (
    <View
      style={styles.container}
    >

      <Header
        title="Attendance"
        subtitle="Football Academy"
      />

      <View
        style={styles.content}
      >

        {/* ==========================================
            DATE
        =========================================== */}

        <View
          style={styles.dateCard}
        >
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() =>
              changeDate(-1)
            }
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={
                colors.textPrimary
              }
            />
          </TouchableOpacity>

          <View
            style={styles.dateCenter}
          >
            <Text
              style={styles.dateLabel}
            >
              ATTENDANCE DATE
            </Text>

            <Text
              style={styles.dateText}
            >
              {selectedDate}
            </Text>
          </View>

          <View
            style={
              styles.dateRightActions
            }
          >
            <TouchableOpacity
              style={
                styles.dateWhatsAppButton
              }
              onPress={
                exportToWhatsApp
              }
            >
              <Ionicons
                name="logo-whatsapp"
                size={21}
                color={
                  colors.white
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() =>
                changeDate(1)
              }
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={
                  colors.textPrimary
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==========================================
            CATEGORY

            IMPORTANT: category buttons are NEVER disabled.
            Every user (coach or admin) can tap any category
            to VIEW its players and attendance. Whether they
            can EDIT that category is decided separately by
            canManageCategory, which only gates the mark/add/
            delete actions below -- not navigation between
            categories. A small eye icon marks categories the
            current coach can only view, not edit.
        =========================================== */}

        <View
          style={
            styles.categorySection
          }
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.categoryScrollContent
            }
          >
            {categories.map(
              (category) => {
                const selected =
                  Number(
                    category.id
                  ) ===
                  Number(
                    selectedCategoryId
                  );

                const isViewOnly =
                  !admin &&
                  coachCategoryId !==
                    null &&
                  Number(
                    category.id
                  ) !==
                    Number(
                      coachCategoryId
                    );

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      selected &&
                        styles.categoryButtonSelected,
                    ]}
                    onPress={() =>
                      setSelectedCategoryId(
                        category.id
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selected &&
                          styles.categoryButtonTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>

                    {isViewOnly && (
                      <Ionicons
                        name="eye-outline"
                        size={11}
                        color={
                          selected
                            ? colors.white
                            : colors.textSecondary
                        }
                        style={
                          styles.categoryViewOnlyIcon
                        }
                      />
                    )}
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>
        </View>

        {/* ==========================================
            VIEW-ONLY NOTICE

            Shown whenever the coach has switched to a
            category that isn't their own, so it's clear
            why the mark buttons below are greyed out.
        =========================================== */}

        {!canManageCategory &&
          selectedCategoryId !== null && (
            <View
              style={
                styles.viewOnlyBanner
              }
            >
              <Ionicons
                name="eye-outline"
                size={15}
                color={
                  colors.textSecondary
                }
              />

              <Text
                style={
                  styles.viewOnlyBannerText
                }
              >
                View only — you can only mark attendance for your assigned category.
              </Text>
            </View>
          )}

        {/* ==========================================
            ERROR
        =========================================== */}

        {error !== "" && (
          <View
            style={
              styles.errorBox
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color="#EF4444"
            />

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setError("")
              }
            >
              <Ionicons
                name="close"
                size={19}
                color="#EF4444"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ==========================================
            ADD PLAYER
        =========================================== */}

        {canManageCategory && (
          <View
            style={
              styles.addPlayerWrapper
            }
          >
            {!showAddPlayer ? (
              <TouchableOpacity
                style={
                  styles.addPlayerToggle
                }
                onPress={() =>
                  setShowAddPlayer(true)
                }
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={
                    colors.primary
                  }
                />

                <Text
                  style={
                    styles.addPlayerToggleText
                  }
                >
                  Add Player
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={
                  styles.addPlayerBox
                }
              >
                <View
                  style={
                    styles.addPlayerHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.addPlayerTitle
                      }
                    >
                      Add Player
                    </Text>

                    <Text
                      style={
                        styles.addPlayerSubtitle
                      }
                    >
                      Add player to this category
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setShowAddPlayer(
                        false
                      );

                      setNewPlayerName(
                        ""
                      );
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={21}
                      color={
                        colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.addPlayerRow
                  }
                >
                  <TextInput
                    value={
                      newPlayerName
                    }
                    onChangeText={
                      setNewPlayerName
                    }
                    placeholder="Player name"
                    placeholderTextColor={
                      colors.textSecondary
                    }
                    style={
                      styles.addPlayerInput
                    }
                    autoCapitalize="words"
                    editable={
                      !addingPlayer
                    }
                    onSubmitEditing={
                      addPlayer
                    }
                  />

                  <TouchableOpacity
                    style={[
                      styles.addPlayerButton,
                      addingPlayer &&
                        styles.disabledButton,
                    ]}
                    disabled={
                      addingPlayer
                    }
                    onPress={
                      addPlayer
                    }
                  >
                    <Text
                      style={
                        styles.addPlayerButtonText
                      }
                    >
                      {addingPlayer
                        ? "Adding..."
                        : "Add"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ==========================================
            COUNTERS
        =========================================== */}

        <View
          style={styles.counterRow}
        >
          <View
            style={[
              styles.counter,
              styles.presentCounter,
            ]}
          >
            <Text
              style={[
                styles.counterNumber,
                styles.presentCounterText,
              ]}
            >
              {counts.present}
            </Text>

            <Text
              style={[
                styles.counterLabel,
                styles.presentCounterText,
              ]}
            >
              Present
            </Text>
          </View>

          <View
            style={[
              styles.counter,
              styles.absentCounter,
            ]}
          >
            <Text
              style={[
                styles.counterNumber,
                styles.absentCounterText,
              ]}
            >
              {counts.absent}
            </Text>

            <Text
              style={[
                styles.counterLabel,
                styles.absentCounterText,
              ]}
            >
              Absent
            </Text>
          </View>

          <View
            style={[
              styles.counter,
              styles.unmarkedCounter,
            ]}
          >
            <Text
              style={[
                styles.counterNumber,
                styles.unmarkedCounterText,
              ]}
            >
              {counts.unmarked}
            </Text>

            <Text
              style={[
                styles.counterLabel,
                styles.unmarkedCounterText,
              ]}
            >
              Unmarked
            </Text>
          </View>

          <View
            style={[
              styles.counter,
              styles.totalCounter,
            ]}
          >
            <Text
              style={[
                styles.counterNumber,
                styles.totalCounterText,
              ]}
            >
              {counts.total}
            </Text>

            <Text
              style={[
                styles.counterLabel,
                styles.totalCounterText,
              ]}
            >
              Total
            </Text>
          </View>
        </View>

        {/* ==========================================
            QUICK ACTIONS
        =========================================== */}

        {players.length > 0 && (
          <View
            style={
              styles.quickActions
            }
          >
            <TouchableOpacity
              style={[
                styles.quickButton,
                styles.quickPresent,
              ]}
              onPress={() =>
                markAll("PRESENT")
              }
              disabled={
                !canManageCategory
              }
            >
              <Ionicons
                name="checkmark-done"
                size={17}
                color="#22C55E"
              />

              <Text
                style={[
                  styles.quickText,
                  styles.quickPresentText,
                ]}
              >
                All Present
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickButton,
                styles.quickAbsent,
              ]}
              onPress={() =>
                markAll("ABSENT")
              }
              disabled={
                !canManageCategory
              }
            >
              <Ionicons
                name="close-circle-outline"
                size={17}
                color="#EF4444"
              />

              <Text
                style={[
                  styles.quickText,
                  styles.quickAbsentText,
                ]}
              >
                All Absent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickButton,
                styles.quickReset,
              ]}
              onPress={
                resetAttendance
              }
              disabled={
                !canManageCategory
              }
            >
              <Ionicons
                name="refresh"
                size={17}
                color="#D1D5DB"
              />

              <Text
                style={[
                  styles.quickText,
                  styles.quickResetText,
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==========================================
            PLAYERS HEADER
        =========================================== */}

        <View
          style={
            styles.playerHeader
          }
        >
          <Text
            style={[
              typography.bodyBold,
              styles.playerHeaderTitle,
            ]}
          >
            Players
          </Text>

          <Text
            style={
              styles.playerCount
            }
          >
            {players.length} players
          </Text>
        </View>

        {/* ==========================================
            PLAYERS
        =========================================== */}

        {loadingAttendance ? (
          <View
            style={
              styles.loadingSmall
            }
          >
            <Text
              style={
                styles.loadingText
              }
            >
              Loading attendance...
            </Text>
          </View>
        ) : players.length === 0 ? (
          <View
            style={
              styles.emptyBox
            }
          >
            <Ionicons
              name="people-outline"
              size={42}
              color="#6B7280"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No players found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              No players are available
              in this category.
            </Text>
          </View>
        ) : (
          <FlatList
            data={players}
            keyExtractor={(item) =>
              String(item.id)
            }
            renderItem={
              renderPlayer
            }
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.playerList
            }
          />
        )}
      </View>

      {/* ==========================================
          FULL SCREEN PHOTO MODAL
      =========================================== */}

      <Modal
        visible={
          previewPhoto !== null
        }
        transparent
        animationType="fade"
        onRequestClose={
          closePhoto
        }
      >
        <View
          style={
            styles.photoModal
          }
        >

          {/* BACKGROUND */}

          <Pressable
            style={
              styles.photoModalBackground
            }
            onPress={
              closePhoto
            }
          />

          {/* CLOSE */}

          <TouchableOpacity
            style={
              styles.photoCloseButton
            }
            onPress={
              closePhoto
            }
          >
            <Ionicons
              name="close"
              size={29}
              color={
                colors.white
              }
            />
          </TouchableOpacity>

          {/* PHOTO */}

          {previewPhoto && (
            <View
              style={
                styles.photoPreviewContainer
              }
            >
              <Image
                source={{
                  uri: previewPhoto,
                }}
                style={
                  styles.photoPreview
                }
                resizeMode="contain"
              />
            </View>
          )}

          {/* PLAYER NAME */}

          <View
            style={
              styles.photoDetails
            }
          >
            <Text
              style={
                styles.photoPlayerName
              }
            >
              {previewPlayerName}
            </Text>

            <Text
              style={
                styles.photoPlayerId
              }
            >
              {previewPlayerId}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        colors.bg,
    },

    content: {
      flex: 1,
      paddingHorizontal:
        spacing.md,
    },

    loadingContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingSmall: {
      paddingVertical:
        spacing.xl,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingText: {
      color:
        colors.textSecondary,
      fontSize: 14,
    },

    // ==================================================
    // DATE
    // ==================================================

    dateCard: {
      marginTop:
        spacing.md,
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.cardBorder,
      borderRadius:
        radius.md,
      minHeight: 70,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    dateButton: {
      width: 52,
      height: 70,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    dateCenter: {
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    dateLabel: {
      fontSize: 10,
      fontWeight: "700",
      color:
        colors.textSecondary,
      letterSpacing: 1,
    },

    dateText: {
      marginTop: 4,
      fontSize: 19,
      fontWeight: "800",
      color:
        colors.textPrimary,
    },

    dateRightActions: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: spacing.xs,
    },

    dateWhatsAppButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#16A34A",
    },

    // ==================================================
    // CATEGORY
    // ==================================================

    categorySection: {
      marginTop:
        spacing.md,
    },

    categoryScrollContent: {
      paddingHorizontal:
        spacing.sm,
      gap: spacing.sm,
    },

    categoryButton: {
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        spacing.sm,
      borderRadius: 999,
      backgroundColor:
        colors.bgElevated,
      borderWidth: 1,
      borderColor:
        colors.cardBorder,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    categoryButtonSelected: {
      backgroundColor:
        colors.primary,
      borderColor:
        colors.primary,
    },

    categoryButtonText: {
      color:
        colors.textSecondary,
      fontSize: 14,
      fontWeight: "700",
    },

    categoryButtonTextSelected: {
      color:
        colors.white,
    },

    categoryViewOnlyIcon: {
      marginLeft: 4,
    },

    // ==================================================
    // VIEW ONLY BANNER
    // ==================================================

    viewOnlyBanner: {
      marginTop:
        spacing.sm,
      padding:
        spacing.sm,
      borderRadius:
        radius.sm,
      backgroundColor:
        colors.bgElevated,
      borderWidth: 1,
      borderColor:
        colors.cardBorder,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: spacing.xs,
    },

    viewOnlyBannerText: {
      flex: 1,
      fontSize: 12,
      color:
        colors.textSecondary,
      fontWeight: "600",
    },

    // ==================================================
    // ERROR
    // ==================================================

    errorBox: {
      marginTop:
        spacing.sm,
      padding:
        spacing.sm,
      borderRadius:
        radius.sm,
      backgroundColor:
        "#35151A",
      borderWidth: 1,
      borderColor:
        "#7F1D1D",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: spacing.xs,
    },

    errorText: {
      flex: 1,
      fontSize: 12,
      color:
        "#FCA5A5",
      fontWeight: "600",
    },

    // ==================================================
    // ADD PLAYER
    // ==================================================

    addPlayerWrapper: {
      marginTop:
        spacing.sm,
    },

    addPlayerToggle: {
      alignSelf:
        "flex-start",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: spacing.xs,
      paddingVertical:
        spacing.sm,
      paddingHorizontal:
        spacing.xs,
    },

    addPlayerToggleText: {
      color:
        colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },

    addPlayerBox: {
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

    addPlayerHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom:
        spacing.sm,
    },

    addPlayerTitle: {
      color:
        colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
    },

    addPlayerSubtitle: {
      marginTop: 2,
      color:
        colors.textSecondary,
      fontSize: 11,
    },

    addPlayerRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: spacing.sm,
    },

    addPlayerInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor:
        colors.cardBorder,
      borderRadius:
        radius.sm,
      paddingHorizontal:
        spacing.sm,
      color:
        colors.textPrimary,
      backgroundColor:
        colors.bg,
      fontSize: 14,
    },

    addPlayerButton: {
      height: 44,
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radius.sm,
      backgroundColor:
        colors.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    addPlayerButtonText: {
      color:
        "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },

    disabledButton: {
      opacity: 0.55,
    },

    // ==================================================
    // COUNTERS
    // ==================================================

    counterRow: {
      marginTop:
        spacing.sm,
      flexDirection:
        "row",
      gap: spacing.xs,
    },

    counter: {
      flex: 1,
      minHeight: 62,
      borderRadius:
        radius.sm,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    presentCounter: {
      backgroundColor:
        "#12301F",
      borderColor:
        "#166534",
    },

    presentCounterText: {
      color:
        "#4ADE80",
    },

    absentCounter: {
      backgroundColor:
        "#35151A",
      borderColor:
        "#991B1B",
    },

    absentCounterText: {
      color:
        "#F87171",
    },

    unmarkedCounter: {
      backgroundColor:
        "#332B12",
      borderColor:
        "#A16207",
    },

    unmarkedCounterText: {
      color:
        "#FBBF24",
    },

    totalCounter: {
      backgroundColor:
        "#142A45",
      borderColor:
        "#1D4ED8",
    },

    totalCounterText: {
      color:
        "#60A5FA",
    },

    counterNumber: {
      fontSize: 19,
      fontWeight: "900",
    },

    counterLabel: {
      marginTop: 1,
      fontSize: 10,
      fontWeight: "700",
    },

    // ==================================================
    // QUICK ACTIONS
    // ==================================================

    quickActions: {
      marginTop:
        spacing.sm,
      flexDirection:
        "row",
      gap: spacing.xs,
    },

    quickButton: {
      flex: 1,
      minHeight: 38,
      borderRadius:
        radius.sm,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      flexDirection:
        "row",
      gap: 4,
    },

    quickPresent: {
      backgroundColor:
        "#12301F",
      borderColor:
        "#166534",
    },

    quickAbsent: {
      backgroundColor:
        "#35151A",
      borderColor:
        "#991B1B",
    },

    quickReset: {
      backgroundColor:
        colors.surfaceLight,
      borderColor:
        colors.cardBorder,
    },

    quickText: {
      fontSize: 10,
      fontWeight: "800",
    },

    quickPresentText: {
      color:
        "#4ADE80",
    },

    quickAbsentText: {
      color:
        "#F87171",
    },

    quickResetText: {
      color:
        "#D1D5DB",
    },

    // ==================================================
    // PLAYERS
    // ==================================================

    playerHeader: {
      marginTop:
        spacing.sm,
      marginBottom:
        spacing.xs,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    playerHeaderTitle: {
      color:
        colors.textPrimary,
    },

    playerCount: {
      fontSize: 11,
      color:
        colors.textSecondary,
      fontWeight: "700",
    },

    playerList: {
      paddingBottom: 24,
      gap: spacing.xs,
    },

    playerCard: {
      minHeight: 64,
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.cardBorder,
      borderRadius:
        radius.sm,
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    playerCardPresent: {
      backgroundColor:
        "#12301F",
      borderColor:
        "#166534",
    },

    playerCardAbsent: {
      backgroundColor:
        "#35151A",
      borderColor:
        "#991B1B",
    },

    playerInfo: {
      flex: 1,
      minWidth: 0,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    // ==================================================
    // DP
    // ==================================================

    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        colors.primarySoft,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight:
        spacing.sm,
      overflow: "hidden",
    },

    avatarText: {
      color:
        colors.primary,
      fontSize: 16,
      fontWeight: "900",
    },

    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },

    // ==================================================
    // PLAYER DETAILS
    // ==================================================

    playerDetails: {
      flex: 1,
      minWidth: 0,
      justifyContent:
        "center",
    },

    playerName: {
      fontSize: 14,
      fontWeight: "800",
      color:
        colors.textPrimary,
    },

    playerId: {
      marginTop: 2,
      fontSize: 10,
      color:
        colors.textSecondary,
      fontWeight: "600",
    },

    // ==================================================
    // ACTIONS
    // ==================================================

    playerActions: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginLeft:
        spacing.xs,
    },

    statusButton: {
      width: 34,
      height: 34,
      borderRadius:
        radius.sm,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    presentButton: {
      backgroundColor:
        "#12301F",
      borderColor:
        "#166534",
    },

    presentActive: {
      backgroundColor:
        "#16A34A",
      borderColor:
        "#16A34A",
    },

    absentButton: {
      backgroundColor:
        "#35151A",
      borderColor:
        "#991B1B",
    },

    absentActive: {
      backgroundColor:
        "#DC2626",
      borderColor:
        "#DC2626",
    },

    deleteButton: {
      width: 34,
      height: 34,
      borderRadius:
        radius.sm,
      backgroundColor:
        "#4B5563",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    // ==================================================
    // EMPTY
    // ==================================================

    emptyBox: {
      marginTop:
        spacing.sm,
      minHeight: 160,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.cardBorder,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        spacing.lg,
    },

    emptyTitle: {
      marginTop:
        spacing.sm,
      fontSize: 16,
      fontWeight: "800",
      color:
        colors.textPrimary,
    },

    emptyText: {
      marginTop:
        spacing.xs,
      fontSize: 13,
      color:
        colors.textSecondary,
      textAlign:
        "center",
    },

    // ==================================================
    // PHOTO MODAL
    // ==================================================

    photoModal: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.96)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    photoModalBackground: {
      ...StyleSheet.absoluteFillObject,
    },

    photoPreviewContainer: {
      width: "94%",
      height: "76%",
      alignItems:
        "center",
      justifyContent:
        "center",
      zIndex: 2,
    },

    photoPreview: {
      width: "100%",
      height: "100%",
    },

    photoCloseButton: {
      position: "absolute",
      top: 38,
      right: 20,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        "rgba(255,255,255,0.16)",
      alignItems:
        "center",
      justifyContent:
        "center",
      zIndex: 10,
    },

    photoDetails: {
      position: "absolute",
      bottom: 32,
      alignItems:
        "center",
      zIndex: 5,
      paddingHorizontal: 20,
    },

    photoPlayerName: {
      color:
        colors.white,
      fontSize: 19,
      fontWeight: "800",
      textAlign:
        "center",
    },

    photoPlayerId: {
      marginTop: 4,
      color:
        colors.textSecondary,
      fontSize: 13,
    },

  });