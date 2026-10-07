import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import api, { apiErrorMessage } from "@/services/api";

interface AdminDashboardData {
  role: "ADMIN";
  total_players: number;
  active_players: number;
  inactive_players: number;
  today_present: number;
  today_absent: number;
  this_month_fees_collected: number;
  pending_fees: number;

  category_summary: {
    category_id: number;
    category_name: string;
    active_players: number;
  }[];

  birthday_reminders: any[];
}

interface CoachDashboardData {
  role: "COACH";
  category_id?: number;
  category_name?: string;
  assigned_category_player_count?: number;
  active_players?: number;
  total_club_players?: number;
  today_present?: number;
  today_absent?: number;
  birthday_reminders: any[];
  error?: string;
}

type DashboardData =
  | AdminDashboardData
  | CoachDashboardData;

// ==================================================
// CATEGORY COLORS
// ==================================================

const CATEGORY_COLORS = [
  "#FF4655",
  "#FF7A45",
  "#FFC21A",
  "#16C784",
  "#1688FF",
  "#9B5CFF",
  "#00B8D9",
];

// ==================================================
// DASHBOARD SCREEN
// ==================================================

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // ==================================================
  // LOAD DASHBOARD
  // ==================================================

  const load = useCallback(async () => {
    try {
      setError(null);

      const response =
        await api.get<DashboardData>(
          "/dashboard"
        );

      console.log(
        "DASHBOARD RESPONSE:",
        response.data
      );

      setData(response.data);
    } catch (e) {
      console.log(
        "DASHBOARD ERROR:",
        e
      );

      setError(
        apiErrorMessage(
          e,
          "Could not load dashboard"
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ==================================================
  // REFRESH
  // ==================================================

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingScreen}
        edges={["top", "bottom"]}
      >
        <ActivityIndicator
          size="large"
          color="#287DFF"
        />

        <Text style={styles.loadingText}>
          Loading Playmaker FC...
        </Text>
      </SafeAreaView>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================

  if (!data) {
    return (
      <SafeAreaView
        style={styles.screen}
        edges={["top", "bottom"]}
      >
        <View style={styles.errorContainer}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color="#FF4D5A"
          />

          <Text style={styles.errorTitle}>
            Dashboard unavailable
          </Text>

          <Text style={styles.errorText}>
            {error ||
              "Could not load dashboard"}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={load}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin =
    data.role === "ADMIN";

  // ==================================================
  // MAIN
  // ==================================================

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#287DFF"
          />
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* =========================================
            HEADER
        ========================================= */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>

            {/* LOGO - ONLY CHANGE */}
            <View style={styles.adminAvatar}>
              <Image
                source={require("@/assets/images/playmaker-logo.png")}
                style={styles.adminLogo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.headerText}>

              <Text style={styles.brand}>
                Playmaker FC
              </Text>

              <Text style={styles.brandSub}>
                {user?.role === "ADMIN"
                  ? "Admin"
                  : "Coach"}
              </Text>

              {user?.role !== "ADMIN" && (
                <Text style={styles.brandUsername}>
                  {user?.username || ""}
                </Text>
              )}

            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutIconButton}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* =========================================
            SMALL ERROR
        ========================================= */}

        {error && (
          <View style={styles.smallError}>

            <Ionicons
              name="warning-outline"
              size={18}
              color="#FF4D5A"
            />

            <Text
              style={styles.smallErrorText}
            >
              {error}
            </Text>

          </View>
        )}

        {/* =========================================
            OVERVIEW
        ========================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Overview
          </Text>
        </View>

        {/* =========================================
            ADMIN DASHBOARD
        ========================================= */}

        {isAdmin ? (
          <>

            {/* 2 x 2 GRID */}

            <View style={styles.grid}>

              {/* TOTAL PLAYERS */}

              <DashboardCard
                icon="people"
                iconColor="#2D8CFF"
                background="#111F3C"
                value={
                  data.total_players
                }
                label="Total Players"
                onPress={() =>
                  router.push("/players")
                }
              />

              {/* ACTIVE PLAYERS */}

              <DashboardCard
                icon="checkmark-circle"
                iconColor="#20D47A"
                background="#102F2A"
                value={
                  data.active_players
                }
                label="Active Players"
                onPress={() =>
                  router.push("/players")
                }
              />

              {/* PRESENT */}

              <DashboardCard
                icon="checkmark-done"
                iconColor="#35C98B"
                background="#102D28"
                value={
                  data.today_present
                }
                label="Today Present"
                onPress={() =>
                  router.push(
                    "/attendance"
                  )
                }
              />

              {/* ABSENT */}

              <DashboardCard
                icon="close-circle"
                iconColor="#FF4D5A"
                background="#341722"
                value={
                  data.today_absent
                }
                label="Today Absent"
                onPress={() =>
                  router.push(
                    "/attendance"
                  )
                }
              />

            </View>

            {/* =====================================
                FEES
            ===================================== */}

            <View style={styles.feeRow}>

              <FeeCard
                value={`₹${Number(
                  data.pending_fees
                ).toLocaleString(
                  "en-IN"
                )}`}
                label="Pending Fees"
                background="#FFEAAE"
                textColor="#241C06"
              />

              <FeeCard
                value={`₹${Number(
                  data.this_month_fees_collected
                ).toLocaleString(
                  "en-IN"
                )}`}
                label="Fees Collected"
                background="#DCEEFB"
                textColor="#081B2B"
              />

            </View>

          </>
        ) : (

          /* =========================================
             COACH DASHBOARD
          ========================================= */

          <View style={styles.grid}>

            <DashboardCard
              icon="people"
              iconColor="#2D8CFF"
              background="#111F3C"
              value={
                data.active_players ?? 0
              }
              label="Active Players"
            />

            <DashboardCard
              icon="football"
              iconColor="#20D47A"
              background="#102F2A"
              value={
                data.total_club_players ?? 0
              }
              label="Club Players"
            />

            <DashboardCard
              icon="checkmark-done"
              iconColor="#35C98B"
              background="#102D28"
              value={
                data.today_present ?? 0
              }
              label="Today Present"
            />

            <DashboardCard
              icon="close-circle"
              iconColor="#FF4D5A"
              background="#341722"
              value={
                data.today_absent ?? 0
              }
              label="Today Absent"
            />

          </View>
        )}

        {/* =========================================
            QUICK ACTIONS
        ========================================= */}

        <View
          style={[
            styles.sectionHeader,
            {
              marginTop: 26,
            },
          ]}
        >
          <Text style={styles.sectionTitle}>
            Quick Actions
          </Text>
        </View>

        <View style={styles.quickRow}>

          <QuickAction
            icon="calendar-outline"
            label="Take Attendance"
            onPress={() =>
              router.push(
                "/attendance"
              )
            }
          />

          <QuickAction
            icon="search-outline"
            label="Find Player"
            onPress={() =>
              router.push("/players")
            }
          />

          {isAdmin && (
            <QuickAction
              icon="cash-outline"
              label="Manage Fees"
              onPress={() =>
                router.push("/fees")
              }
            />
          )}

        </View>

        {/* =========================================
            CATEGORY SUMMARY
        ========================================= */}

        {isAdmin &&
          data.category_summary &&
          data.category_summary.length >
            0 && (
            <>

              <View
                style={[
                  styles.sectionHeader,
                  {
                    marginTop: 28,
                  },
                ]}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Category Summary
                </Text>
              </View>

              {/* CHIPS */}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.chipScroll
                }
              >

                {data.category_summary.map(
                  (category, index) => {

                    const chipColor =
                      CATEGORY_COLORS[
                        index %
                          CATEGORY_COLORS.length
                      ];

                    return (
                      <View
                        key={`chip-${category.category_id}`}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              chipColor,
                          },
                        ]}
                      >

                        <Text
                          style={
                            styles.chipText
                          }
                        >
                          {
                            category.category_name
                          }
                          :{" "}
                          {
                            category.active_players
                          }
                        </Text>

                      </View>
                    );
                  }
                )}

              </ScrollView>

              {/* CATEGORY LIST */}

              <View
                style={styles.categoryCard}
              >

                {data.category_summary.map(
                  (category, index) => (

                    <CategoryRow
                      key={
                        category.category_id
                      }
                      name={
                        category.category_name
                      }
                      players={
                        category.active_players
                      }
                      index={index}
                      onPress={() =>
                        router.push(
                          "/attendance"
                        )
                      }
                    />

                  )
                )}

              </View>

            </>
          )}

        {/* =========================================
            BIRTHDAY REMINDERS
        ========================================= */}

        {data.birthday_reminders &&
          data.birthday_reminders
            .length > 0 && (

            <View
              style={
                styles.birthdaySection
              }
            >

              <View
                style={
                  styles.sectionHeader
                }
              >

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Birthday Reminders
                </Text>

              </View>

              {data.birthday_reminders
                .slice(0, 3)
                .map(
                  (
                    birthday: any,
                    index: number
                  ) => (

                    <View
                      key={index}
                      style={
                        styles.birthdayCard
                      }
                    >

                      <View
                        style={
                          styles.birthdayIcon
                        }
                      >

                        <Ionicons
                          name="gift-outline"
                          size={21}
                          color="#FF6B81"
                        />

                      </View>

                      <View
                        style={
                          styles.birthdayInfo
                        }
                      >

                        <Text
                          style={
                            styles.birthdayName
                          }
                        >
                          {birthday.player_name ||
                            birthday.name ||
                            "Player"}
                        </Text>

                        <Text
                          style={
                            styles.birthdayText
                          }
                        >
                          Birthday reminder
                        </Text>

                      </View>

                    </View>

                  )
                )}

            </View>

          )}

        {/* =========================================
            BOTTOM SPACE
        ========================================= */}

        <View style={styles.bottomSpace} />

      </ScrollView>
    </SafeAreaView>
  );
}

/* ==================================================
   DASHBOARD CARD
================================================== */

function DashboardCard({
  icon,
  iconColor,
  background,
  value,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  background: string;
  value: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.dashboardCard,
        {
          backgroundColor:
            background,
        },
      ]}
    >

      <View
        style={[
          styles.cardIcon,
          {
            backgroundColor:
              `${iconColor}25`,
          },
        ]}
      >

        <Ionicons
          name={icon}
          size={22}
          color={iconColor}
        />

      </View>

      <Text
        style={styles.cardValue}
      >
        {value}
      </Text>

      <Text
        style={styles.cardLabel}
      >
        {label}
      </Text>

    </TouchableOpacity>
  );
}

/* ==================================================
   FEE CARD
================================================== */

function FeeCard({
  value,
  label,
  background,
  textColor,
}: {
  value: string;
  label: string;
  background: string;
  textColor: string;
}) {
  return (
    <View
      style={[
        styles.feeCard,
        {
          backgroundColor:
            background,
        },
      ]}
    >

      <Text
        style={[
          styles.feeValue,
          {
            color: textColor,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.feeLabel,
          {
            color: textColor,
          },
        ]}
      >
        {label}
      </Text>

    </View>
  );
}

/* ==================================================
   QUICK ACTION
================================================== */

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.quickAction}
      onPress={onPress}
    >

      <View
        style={styles.quickIcon}
      >

        <Ionicons
          name={icon}
          size={23}
          color="#B7C8E8"
        />

      </View>

      <Text
        style={styles.quickLabel}
        numberOfLines={2}
      >
        {label}
      </Text>

    </TouchableOpacity>
  );
}

/* ==================================================
   CATEGORY ROW
================================================== */

function CategoryRow({
  name,
  players,
  index,
  onPress,
}: {
  name: string;
  players: number;
  index: number;
  onPress?: () => void;
}) {
  const categoryColor =
    CATEGORY_COLORS[
      index % CATEGORY_COLORS.length
    ];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.categoryRow}
    >

      <View
        style={[
          styles.categoryIcon,
          {
            backgroundColor:
              `${categoryColor}30`,
          },
        ]}
      >

        <Ionicons
          name="shirt-outline"
          size={18}
          color={categoryColor}
        />

      </View>

      <Text
        style={styles.categoryName}
        numberOfLines={1}
      >
        {name}
      </Text>

      <Text
        style={styles.categoryPlayers}
      >
        {players} players
      </Text>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#71809A"
      />

    </TouchableOpacity>
  );
}

/* ==================================================
   STYLES
================================================== */

const styles = StyleSheet.create({

  /* ===============================================
     SCREEN
  =============================================== */

  screen: {
    flex: 1,
    backgroundColor: "#08111F",
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 0,
  },

  /* ===============================================
     LOADING
  =============================================== */

  loadingScreen: {
    flex: 1,
    backgroundColor: "#08111F",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#AAB6CE",
    marginTop: 12,
    fontSize: 14,
  },

  /* ===============================================
     HEADER
  =============================================== */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 22,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  adminAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#243D66",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#45638F",
  },

  /* LOGO STYLE - ONLY ADDITION */

  adminLogo: {
    width: 44,
    height: 44,
  },

  headerText: {
    marginLeft: 12,
  },

  brand: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  brandSub: {
    color: "#8EA1C2",
    fontSize: 12,
    marginTop: 1,
  },

  brandUsername: {
    color: "#7185A7",
    fontSize: 11,
    marginTop: 1,
  },

  logoutIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#15233B",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ===============================================
     SECTION
  =============================================== */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  /* ===============================================
     OVERVIEW GRID
  =============================================== */

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },

  dashboardCard: {
    width: "48%",
    minHeight: 138,

    borderRadius: 17,

    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.08)",

    padding: 15,

    marginBottom: 10,
  },

  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 9,
  },

  cardValue: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },

  cardLabel: {
    color: "#AAB7CE",
    fontSize: 12,
    marginTop: 3,
  },

  /* ===============================================
     FEES
  =============================================== */

  feeRow: {
    flexDirection: "row",

    justifyContent:
      "space-between",

    marginTop: 0,
  },

  feeCard: {
    width: "48%",

    minHeight: 100,

    borderRadius: 17,

    paddingHorizontal: 14,
    paddingVertical: 16,

    justifyContent: "center",

    marginBottom: 10,
  },

  feeValue: {
    fontSize: 23,
    fontWeight: "800",
  },

  feeLabel: {
    fontSize: 11,
    marginTop: 5,
    opacity: 0.85,
  },

  /* ===============================================
     QUICK ACTIONS
  =============================================== */

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  quickAction: {
    width: "31.5%",
    height: 92,

    borderRadius: 16,

    backgroundColor: "#14223A",

    borderWidth: 1,
    borderColor: "#253858",

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 5,
  },

  quickIcon: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: "#1C2E4C",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 7,
  },

  quickLabel: {
    color: "#B7C5DC",
    fontSize: 10.5,
    fontWeight: "600",
    textAlign: "center",
  },

  /* ===============================================
     CATEGORY CHIPS
  =============================================== */

  chipScroll: {
    gap: 8,
    paddingBottom: 12,
  },

  chip: {
    paddingHorizontal: 14,
    height: 32,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",
  },

  chipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* ===============================================
     CATEGORY LIST
  =============================================== */

  categoryCard: {
    backgroundColor: "#101D31",

    borderRadius: 17,

    borderWidth: 1,
    borderColor: "#263955",

    overflow: "hidden",
  },

  categoryRow: {
    minHeight: 57,

    paddingHorizontal: 13,

    flexDirection: "row",
    alignItems: "center",

    borderBottomWidth: 1,
    borderBottomColor: "#1D2C42",
  },

  categoryIcon: {
    width: 34,
    height: 34,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 12,
  },

  categoryName: {
    flex: 1,

    color: "#FFFFFF",

    fontSize: 14,
    fontWeight: "700",
  },

  categoryPlayers: {
    color: "#B5C2D8",

    fontSize: 13,

    marginRight: 8,
  },

  /* ===============================================
     BIRTHDAY
  =============================================== */

  birthdaySection: {
    marginTop: 8,
  },

  birthdayCard: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#111F34",

    borderRadius: 15,

    borderWidth: 1,
    borderColor: "#263955",

    padding: 13,

    marginBottom: 8,
  },

  birthdayIcon: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: "#3A1E2B",

    alignItems: "center",
    justifyContent: "center",
  },

  birthdayInfo: {
    marginLeft: 12,
  },

  birthdayName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  birthdayText: {
    color: "#8392AA",
    fontSize: 11,
    marginTop: 3,
  },

  /* ===============================================
     ERROR
  =============================================== */

  smallError: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#351923",

    borderRadius: 12,

    padding: 12,

    marginBottom: 16,

    gap: 8,
  },

  smallErrorText: {
    flex: 1,
    color: "#FF7A84",
    fontSize: 12,
  },

  errorContainer: {
    margin: 20,
    marginTop: 100,

    backgroundColor: "#121F33",

    borderRadius: 20,

    padding: 25,

    alignItems: "center",
  },

  errorTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 14,
  },

  errorText: {
    color: "#9BAAC1",

    textAlign: "center",

    marginTop: 8,

    lineHeight: 20,
  },

  retryButton: {
    marginTop: 20,

    backgroundColor: "#287DFF",

    borderRadius: 12,

    paddingHorizontal: 30,
    paddingVertical: 12,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* ===============================================
     BOTTOM SPACE
  =============================================== */

  bottomSpace: {
    height: 125,
  },
});