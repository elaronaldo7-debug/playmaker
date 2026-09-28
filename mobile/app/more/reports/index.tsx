import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import CategorySelector, {
  CategoryOption,
} from "@/components/CategorySelector";
import Loading from "@/components/Loading";
import EmptyState from "@/components/EmptyState";

import { useAuth } from "@/context/AuthContext";
import {
  isAdmin as checkIsAdmin,
  assignedCategoryId,
} from "@/utils/permissions";

import { listCategories } from "@/services/categories";
import { listPlayers } from "@/services/players";
import {
  getAttendanceReport,
  getFeesReport,
} from "@/services/reports";

import {
  Player,
  AttendanceRecord,
  Fee,
} from "@/types";

import { apiErrorMessage } from "@/services/api";

import {
  colors,
  spacing,
  radius,
  typography,
  feeStatusColor,
} from "@/constants/theme";

/* =========================================================
   HELPERS
========================================================= */

function currentMonthKey(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");

  return new Date(
    Number(year),
    Number(monthNumber) - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

/* =========================================================
   TYPES
========================================================= */

interface PlayerWiseRow {
  player: Player;
  present: number;
  absent: number;
  unmarked: number;
  percentage: number;
  fee: Fee | null;
}

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ReportsScreen() {
  const { user } = useAuth();

  const admin = checkIsAdmin(user);

  /* -------------------------
     Categories
  ------------------------- */

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number | null>(null);

  /* -------------------------
     Month
  ------------------------- */

  const [month, setMonth] = useState(currentMonthKey());

  /* -------------------------
     Loading / Error
  ------------------------- */

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [loadingReport, setLoadingReport] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* -------------------------
     Report Data
  ------------------------- */

  const [activePlayers, setActivePlayers] =
    useState<Player[]>([]);

  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([]);

  const [feeRecords, setFeeRecords] =
    useState<Fee[]>([]);

  const [feesCollected, setFeesCollected] =
    useState(0);

  const [feesPending, setFeesPending] =
    useState(0);

  /* =========================================================
     LOAD CATEGORIES
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      setLoadingCategories(true);

      try {
        if (admin) {
          const data = await listCategories(true);

          if (!mounted) return;

          const mappedCategories: CategoryOption[] =
            data.map((category) => ({
              id: category.id,
              name: category.name,
            }));

          setCategories(mappedCategories);

          if (mappedCategories.length > 0) {
            setSelectedCategoryId((current) => {
              const stillExists =
                current !== null &&
                mappedCategories.some(
                  (category) => category.id === current
                );

              return stillExists
                ? current
                : mappedCategories[0].id;
            });
          } else {
            setSelectedCategoryId(null);
          }
        } else {
          const categoryId = assignedCategoryId(user);

          if (!mounted) return;

          if (categoryId !== null) {
            setCategories([
              {
                id: categoryId,
                name:
                  user?.coach?.category_name ||
                  "My Category",
              },
            ]);

            setSelectedCategoryId(categoryId);
          } else {
            setCategories([]);
            setSelectedCategoryId(null);
          }
        }

        if (mounted) {
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setError(
            apiErrorMessage(
              e,
              "Could not load categories"
            )
          );
        }
      } finally {
        if (mounted) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, [admin, user]);

  /* =========================================================
     SELECTED CATEGORY NAME
  ========================================================= */

  const selectedCategoryName = useMemo(() => {
    return (
      categories.find(
        (category) =>
          category.id === selectedCategoryId
      )?.name ?? ""
    );
  }, [categories, selectedCategoryId]);

  /* =========================================================
     LOAD REPORT
  ========================================================= */

  const loadReport = useCallback(async () => {
    if (selectedCategoryId === null) {
      return;
    }

    setLoadingReport(true);
    setError(null);

    try {
      const [
        playersRes,
        attendanceRes,
        feesRes,
      ] = await Promise.all([
        /* Active players */
        listPlayers({
          category_id: selectedCategoryId,
          status: "ACTIVE",
          per_page: 200,
        }),

        /* Attendance */
        getAttendanceReport({
          category_id: selectedCategoryId,
          month,
        }),

        /* Fees */
        getFeesReport({
          category_id: selectedCategoryId,
          month,
        }),
      ]);

      setActivePlayers(playersRes.players);

      setAttendanceRecords(
        attendanceRes.records
      );

      setFeeRecords(
        feesRes.records
      );

      setFeesCollected(
        feesRes.summary.total_collected
      );

      setFeesPending(
        feesRes.summary.total_pending
      );
    } catch (e) {
      setError(
        apiErrorMessage(
          e,
          "Could not load report"
        )
      );
    } finally {
      setLoadingReport(false);
    }
  }, [selectedCategoryId, month]);

  /* =========================================================
     LOAD REPORT WHEN CATEGORY / MONTH CHANGES
  ========================================================= */

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  /* =========================================================
     CHANGE MONTH
  ========================================================= */

  const shiftMonth = (delta: number) => {
    const [year, monthNumber] =
      month.split("-").map(Number);

    const date = new Date(
      year,
      monthNumber - 1 + delta,
      1
    );

    const newMonth =
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

    setMonth(newMonth);
  };

  /* =========================================================
     ATTENDANCE SUMMARY
  ========================================================= */

  const attendanceSummary = useMemo(() => {
    const present =
      attendanceRecords.filter(
        (record) =>
          record.status === "PRESENT"
      ).length;

    const absent =
      attendanceRecords.filter(
        (record) =>
          record.status === "ABSENT"
      ).length;

    const unmarked =
      attendanceRecords.filter(
        (record) =>
          record.status === "UNMARKED"
      ).length;

    const marked = present + absent;

    const percentage =
      marked > 0
        ? Math.round(
            (present / marked) * 100
          )
        : 0;

    return {
      totalPlayers:
        activePlayers.length,

      present,
      absent,
      unmarked,
      percentage,
    };
  }, [
    activePlayers,
    attendanceRecords,
  ]);

  /* =========================================================
     TOTAL FEE AMOUNT
  ========================================================= */

  const totalFeeAmount = useMemo(() => {
    return feeRecords.reduce(
      (sum, fee) =>
        sum + Number(fee.fee_amount || 0),
      0
    );
  }, [feeRecords]);

  /* =========================================================
     PLAYER-WISE REPORT
  ========================================================= */

  const playerWiseRows: PlayerWiseRow[] =
    useMemo(() => {
      return activePlayers.map((player) => {
        const playerAttendance =
          attendanceRecords.filter(
            (record) =>
              record.player_id === player.id
          );

        const present =
          playerAttendance.filter(
            (record) =>
              record.status === "PRESENT"
          ).length;

        const absent =
          playerAttendance.filter(
            (record) =>
              record.status === "ABSENT"
          ).length;

        const unmarked =
          playerAttendance.filter(
            (record) =>
              record.status === "UNMARKED"
          ).length;

        const marked =
          present + absent;

        const percentage =
          marked > 0
            ? Math.round(
                (present / marked) * 100
              )
            : 0;

        const fee =
          feeRecords.find(
            (item) =>
              item.player_id === player.id
          ) ?? null;

        return {
          player,
          present,
          absent,
          unmarked,
          percentage,
          fee,
        };
      });
    }, [
      activePlayers,
      attendanceRecords,
      feeRecords,
    ]);

  /* =========================================================
     LOADING
  ========================================================= */

  const showLoading =
    loadingCategories ||
    loadingReport;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <ScreenContainer
      contentContainerStyle={
        styles.scrollPadding
      }
    >
      {/* Header */}
      <Header
        title="Reports"
        subtitle={
          selectedCategoryName || undefined
        }
      />

      {/* =====================================================
          MONTH SELECTOR
      ===================================================== */}

      <View style={styles.monthRow}>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => shiftMonth(-1)}
          hitSlop={10}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.monthText}>
          {monthLabel(month)}
        </Text>

        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => shiftMonth(1)}
          hitSlop={10}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* =====================================================
          ADMIN CATEGORY SELECTOR
      ===================================================== */}

      {admin &&
        categories.length > 0 && (
          <View style={styles.categoryWrap}>
            <CategorySelector
              categories={categories}
              selectedId={
                selectedCategoryId
              }
              onSelect={
                setSelectedCategoryId
              }
            />
          </View>
        )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {showLoading ? (
        <Loading label="Loading report..." />
      ) : !selectedCategoryId ? (
        <EmptyState
          icon="alert-circle-outline"
          title="No category assigned"
          message="Contact your admin to get a category assigned before viewing reports."
        />
      ) : (
        <>
          {/* =================================================
              ATTENDANCE REPORT
          ================================================= */}

          <Text style={styles.sectionTitle}>
            Attendance Report
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              <SummaryStat
                label="Total Players"
                value={
                  attendanceSummary.totalPlayers
                }
                color={
                  colors.textPrimary
                }
              />

              <SummaryStat
                label="Present"
                value={
                  attendanceSummary.present
                }
                color={
                  colors.present
                }
              />

              <SummaryStat
                label="Absent"
                value={
                  attendanceSummary.absent
                }
                color={
                  colors.absent
                }
              />

              <SummaryStat
                label="Unmarked"
                value={
                  attendanceSummary.unmarked
                }
                color={
                  colors.unmarked
                }
              />
            </View>

            <View
              style={
                styles.percentageRow
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
                {attendanceSummary.percentage}%
              </Text>
            </View>
          </View>

          {/* =================================================
              FEES REPORT
          ================================================= */}

          <Text style={styles.sectionTitle}>
            Fees Report
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              <SummaryStat
                label="Total Fees"
                value={`₹${totalFeeAmount.toLocaleString(
                  "en-IN"
                )}`}
                color={
                  colors.textPrimary
                }
              />

              <SummaryStat
                label="Collected"
                value={`₹${Number(
                  feesCollected || 0
                ).toLocaleString(
                  "en-IN"
                )}`}
                color={
                  colors.present
                }
              />

              <SummaryStat
                label="Pending"
                value={`₹${Number(
                  feesPending || 0
                ).toLocaleString(
                  "en-IN"
                )}`}
                color={
                  colors.absent
                }
              />
            </View>
          </View>

          {/* =================================================
              PLAYER-WISE REPORT
          ================================================= */}

          <Text style={styles.sectionTitle}>
            Player-wise Report
          </Text>

          {playerWiseRows.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No active players"
              message="This category has no active players yet."
            />
          ) : (
            <View style={styles.playerList}>
              {playerWiseRows.map(
                (row) => (
                  <PlayerWiseCard
                    key={row.player.id}
                    row={row}
                  />
                )
              )}
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

/* =========================================================
   SUMMARY STAT
========================================================= */

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={styles.statBlock}>
      <Text
        style={[
          styles.statValue,
          { color },
        ]}
      >
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   PLAYER-WISE CARD
========================================================= */

function PlayerWiseCard({
  row,
}: {
  row: PlayerWiseRow;
}) {
  const {
    player,
    present,
    absent,
    unmarked,
    percentage,
    fee,
  } = row;

  const feeColor = fee
    ? feeStatusColor(fee.status)
    : colors.textMuted;

  return (
    <View style={styles.playerCard}>
      {/* Player Name */}
      <Text
        style={styles.playerName}
        numberOfLines={1}
      >
        {player.player_name}
      </Text>

      {/* Attendance */}
      <View
        style={
          styles.playerRowSection
        }
      >
        <Text
          style={
            styles.playerRowLabel
          }
        >
          Attendance
        </Text>

        <Text
          style={
            styles.playerRowValue
          }
        >
          <Text
            style={{
              color: colors.present,
            }}
          >
            {present}P
          </Text>

          {" · "}

          <Text
            style={{
              color: colors.absent,
            }}
          >
            {absent}A
          </Text>

          {" · "}

          <Text
            style={{
              color: colors.unmarked,
            }}
          >
            {unmarked}U
          </Text>

          {" · "}

          {percentage}%
        </Text>
      </View>

      {/* Fee */}
      <View
        style={
          styles.playerRowSection
        }
      >
        <Text
          style={
            styles.playerRowLabel
          }
        >
          Fee
        </Text>

        {fee ? (
          <Text
            style={
              styles.playerRowValue
            }
          >
            ₹
            {Number(
              fee.paid_amount || 0
            ).toLocaleString(
              "en-IN"
            )}

            {" / "}

            ₹
            {Number(
              fee.fee_amount || 0
            ).toLocaleString(
              "en-IN"
            )}

            {"  "}

            <Text
              style={{
                color: feeColor,
                fontWeight: "700",
              }}
            >
              {fee.status}
            </Text>
          </Text>
        ) : (
          <Text
            style={
              styles.playerRowValueMuted
            }
          >
            No fee record for this month
          </Text>
        )}
      </View>

      {/* Balance */}
      {fee &&
        Number(fee.balance || 0) > 0 && (
          <Text
            style={styles.balanceText}
          >
            Balance: ₹
            {Number(
              fee.balance || 0
            ).toLocaleString(
              "en-IN"
            )}
          </Text>
        )}
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  scrollPadding: {
    paddingBottom:
      spacing.xxl * 2,
  },

  /* Month */
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },

  monthArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor:
      colors.card,
    borderWidth: 1,
    borderColor:
      colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  monthText: {
    ...typography.h3,
    color: colors.textPrimary,
  },

  /* Category */
  categoryWrap: {
    marginBottom: spacing.sm,
  },

  /* Error */
  errorBox: {
    backgroundColor:
      colors.absentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  errorText: {
    ...typography.body,
    color: colors.absent,
  },

  /* Section */
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  /* Summary */
  summaryCard: {
    backgroundColor:
      colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor:
      colors.cardBorder,
    padding: spacing.md,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent:
      "space-between",
  },

  statBlock: {
    width: "48%",
    marginBottom: spacing.sm,
  },

  statValue: {
    ...typography.h2,
  },

  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Percentage */
  percentageRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor:
      colors.cardBorder,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },

  percentageLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  percentageValue: {
    ...typography.h2,
    color: colors.primary,
  },

  /* Player List */
  playerList: {
    gap: spacing.sm,
  },

  /* Player Card */
  playerCard: {
    backgroundColor:
      colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor:
      colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  playerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  playerRowSection: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },

  playerRowLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  playerRowValue: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  playerRowValueMuted: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: "italic",
  },

  balanceText: {
    ...typography.caption,
    color: colors.absent,
    marginTop: spacing.xs,
    textAlign: "right",
  },
});