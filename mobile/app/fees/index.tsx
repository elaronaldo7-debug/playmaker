import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../services/api";
import { colors } from "@/constants/theme";

type Category = {
  id: number;
  name: string;
  is_active?: boolean;
};

type Player = {
  id: number;
  player_id: string;
  player_name: string;
  category_id: number;
  status?: string;
};

type Fee = {
  id: number;
  player_id: number;
  player_name?: string | null;
  category_id?: number;
  fee_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  month: string;
  payments?: FeePayment[];
};

type FeePayment = {
  id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
};

type FeeRow = {
  player: Player;
  fee: Fee | null;
};

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER"];

// Quick preset amounts shown as tappable chips in the Set/Edit Fee
// modal, so the admin usually doesn't need to type anything at all.
const QUICK_AMOUNTS = [500, 800, 1000, 1500, 2000];

export default function FeesScreen() {
  const { user } = useAuth();

  // Keep the main fee-list scroll position when fee/payment data reloads.
  // Without this, loadData() replaces the list state and ScrollView jumps to top.
  const feesScrollRef = useRef<ScrollView>(null);
  const feesScrollPosition = useRef(0);

  const isAdmin =
    user?.role === "ADMIN" || user?.role === "admin";

  const coachCategoryId = useMemo(
    () => user?.coach?.category_id ?? null,
    [user?.coach?.category_id]
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- COLLECT PAYMENT ---------------- */

  const [showCollect, setShowCollect] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [savingPayment, setSavingPayment] = useState(false);

  /* ---------------- SET / EDIT FEE (single player) ---------------- */

  const [showSetFee, setShowSetFee] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(
    null
  );
  const [feeAmountInput, setFeeAmountInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  /* ---------------- SET FEE FOR ALL (bulk) ---------------- */

  const [showBulkSetFee, setShowBulkSetFee] = useState(false);
  const [bulkAmountInput, setBulkAmountInput] = useState("");
  const [savingBulkFee, setSavingBulkFee] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  /* ---------------- PAYMENT HISTORY ---------------- */

  const [showHistory, setShowHistory] = useState(false);
  const [historyFee, setHistoryFee] = useState<Fee | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /* ---------------- MONTH ---------------- */

  const [monthDate, setMonthDate] = useState(new Date());

  const month = monthDate.getMonth() + 1;
  const year = monthDate.getFullYear();

  // Backend stores month as YYYY-MM, e.g. September 2026 = 2026-09
  const feeMonth = `${year}-${String(month).padStart(2, "0")}`;

  const monthName = monthDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  /* ---------------- LOAD CATEGORIES ---------------- */

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get<Category[]>(
        "/categories?active_only=true"
      );

      let data = response.data || [];

      // Coach can only see their assigned category.
      if (!isAdmin && coachCategoryId) {
        data = data.filter(
          (category) => category.id === Number(coachCategoryId)
        );
      }

      data.sort((a, b) => a.name.localeCompare(b.name));

      setCategories(data);

      if (data.length > 0) {
        setSelectedCategoryId((current) => {
          if (current && data.some((category) => category.id === current)) {
            return current;
          }
          return data[0].id;
        });
      }
    } catch (error) {
      Alert.alert(
        "Error",
        apiErrorMessage(error, "Unable to load categories")
      );
    }
  }, [isAdmin, coachCategoryId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /* ---------------- LOAD PLAYERS + FEES ---------------- */

  const loadData = useCallback(async () => {
    if (!selectedCategoryId) {
      setPlayers([]);
      setFees([]);
      return;
    }

    try {
      setLoading(true);

      const playersResponse = await api.get<{ players: Player[] }>(
        `/players?category_id=${selectedCategoryId}&per_page=200`
      );

      // Backend expects month as YYYY-MM, no separate year parameter.
      const feesResponse = await api.get<Fee[]>(
        `/fees?category_id=${selectedCategoryId}&month=${feeMonth}`
      );

      const allPlayers = playersResponse.data?.players || [];

      const activePlayers = allPlayers.filter(
        (player) => String(player.status || "").toUpperCase() === "ACTIVE"
      );

      const feeData = feesResponse.data || [];

      setPlayers(activePlayers);
      setFees(feeData);
    } catch (error) {
      Alert.alert("Error", apiErrorMessage(error, "Unable to load fee data"));
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, feeMonth]);

  // Reload the fee data without sending the main list back to the top.
  const reloadFeesKeepPosition = useCallback(async () => {
    const currentY = feesScrollPosition.current;

    await loadData();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        feesScrollRef.current?.scrollTo({
          y: currentY,
          animated: false,
        });
      });
    });
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------------- FEE MAP ---------------- */

  const feeByPlayer = useMemo(() => {
    const map = new Map<number, Fee>();
    fees.forEach((fee) => {
      map.set(Number(fee.player_id), fee);
    });
    return map;
  }, [fees]);

  /* ---------------- PLAYER ROWS ---------------- */

  const rows = useMemo<FeeRow[]>(
    () =>
      players.map((player) => ({
        player,
        fee: feeByPlayer.get(Number(player.id)) || null,
      })),
    [players, feeByPlayer]
  );

  // Players in the current category/month that don't have a fee row yet
  // -- this is exactly the list the bulk "Set Fee for All" action fills in.
  const playersWithoutFee = useMemo(
    () => rows.filter((row) => !row.fee).map((row) => row.player),
    [rows]
  );

  /* ---------------- SUMMARY ---------------- */

  const summary = useMemo(() => {
    let total = 0;
    let collected = 0;
    let pending = 0;

    let paidPlayers = 0;
    let pendingPlayers = 0;
    let partialPlayers = 0;
    let notSetPlayers = 0;

    rows.forEach(({ fee }) => {
      if (!fee) {
        notSetPlayers++;
        return;
      }

      total += Number(fee.fee_amount || 0);
      collected += Number(fee.paid_amount || 0);
      pending += Number(fee.balance || 0);

      const status = String(fee.status).toUpperCase();

      if (status === "PAID") {
        paidPlayers++;
      } else if (status === "PARTIAL") {
        partialPlayers++;
      } else {
        pendingPlayers++;
      }
    });

    return {
      total,
      collected,
      pending,
      paidPlayers,
      pendingPlayers,
      partialPlayers,
      notSetPlayers,
      totalPlayers: rows.length,
      feeSetPlayers: rows.length - notSetPlayers,
    };
  }, [rows]);

  /* ---------------- MONTH NAVIGATION ---------------- */

  const previousMonth = () => {
    setMonthDate((current) => {
      const date = new Date(current);
      date.setMonth(date.getMonth() - 1);
      return date;
    });
  };

  const nextMonth = () => {
    setMonthDate((current) => {
      const date = new Date(current);
      date.setMonth(date.getMonth() + 1);
      return date;
    });
  };

  /* =====================================================
     SET / EDIT FEE (single player)
     ===================================================== */

  const openSetFee = (player: Player, fee: Fee | null) => {
    if (!isAdmin) return;

    setSelectedPlayer(player);
    setFeeAmountInput(fee ? String(Number(fee.fee_amount || 0)) : "");
    setShowSetFee(true);
  };

  const closeSetFee = () => {
    if (savingFee) return;

    setShowSetFee(false);
    setSelectedPlayer(null);
    setFeeAmountInput("");
  };

  const submitFee = async () => {
    if (!selectedPlayer) return;

    const amount = Number(feeAmountInput);

    // 0 is allowed here -- that's what "Free" sets, and a fee of ₹0 is a
    // valid, deliberate choice, not an error like an empty/invalid field.
    if (feeAmountInput.trim() === "" || Number.isNaN(amount) || amount < 0) {
      Alert.alert("Invalid fee", "Enter a valid fee amount, or tap Free.");
      return;
    }

    const existingFee = feeByPlayer.get(Number(selectedPlayer.id)) || null;

    try {
      setSavingFee(true);

      // POST /fees upserts (creates if missing, updates if a fee already
      // exists for this player + month), so both "set" and "edit" use
      // the same call.
      await api.post("/fees", {
        player_id: selectedPlayer.id,
        month: feeMonth,
        fee_amount: amount,
      });

      setShowSetFee(false);
      setSelectedPlayer(null);
      setFeeAmountInput("");

      await reloadFeesKeepPosition();

      Alert.alert(
        "Success",
        existingFee
          ? "Player fee updated successfully."
          : "Player fee set successfully."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        apiErrorMessage(error, "Unable to save player fee")
      );
    } finally {
      setSavingFee(false);
    }
  };

  /* =====================================================
     SET FEE FOR ALL (bulk, only for players without a fee yet)
     ===================================================== */

  const openBulkSetFee = () => {
    if (!isAdmin) return;

    setBulkAmountInput("");
    setShowBulkSetFee(true);
  };

  const closeBulkSetFee = () => {
    if (savingBulkFee) return;

    setShowBulkSetFee(false);
    setBulkAmountInput("");
  };

  const submitBulkFee = async () => {
    const amount = Number(bulkAmountInput);

    if (bulkAmountInput.trim() === "" || Number.isNaN(amount) || amount < 0) {
      Alert.alert("Invalid fee", "Enter a valid fee amount, or tap Free.");
      return;
    }

    if (playersWithoutFee.length === 0) {
      setShowBulkSetFee(false);
      return;
    }

    try {
      setSavingBulkFee(true);
      setBulkProgress({ done: 0, total: playersWithoutFee.length });

      // Backend only exposes a single-player upsert endpoint, so bulk
      // "set for all" just calls it once per player, sequentially, and
      // keeps a running progress count on screen.
      for (let i = 0; i < playersWithoutFee.length; i++) {
        const player = playersWithoutFee[i];

        await api.post("/fees", {
          player_id: player.id,
          month: feeMonth,
          fee_amount: amount,
        });

        setBulkProgress({ done: i + 1, total: playersWithoutFee.length });
      }

      setShowBulkSetFee(false);
      setBulkAmountInput("");

      await reloadFeesKeepPosition();

      Alert.alert(
        "Success",
        `Fee set for ${playersWithoutFee.length} player${
          playersWithoutFee.length > 1 ? "s" : ""
        }.`
      );
    } catch (error) {
      Alert.alert(
        "Error",
        apiErrorMessage(error, "Unable to set fee for all players")
      );
      // Reload anyway so already-saved rows from this batch show up.
      await reloadFeesKeepPosition();
    } finally {
      setSavingBulkFee(false);
      setBulkProgress({ done: 0, total: 0 });
    }
  };

  /* =====================================================
     COLLECT PAYMENT
     ===================================================== */

  const openCollect = (fee: Fee) => {
    if (!isAdmin) return;

    setSelectedFee(fee);
    setCollectAmount(String(Number(fee.balance || 0)));
    setPaymentMethod("CASH");
    setShowCollect(true);
  };

  const closeCollect = () => {
    if (savingPayment) return;

    setShowCollect(false);
    setSelectedFee(null);
    setCollectAmount("");
    setPaymentMethod("CASH");
  };

  const submitPayment = async () => {
    if (!selectedFee) return;

    const amount = Number(collectAmount);
    const pendingAmount = Number(selectedFee.balance || 0);

    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid payment amount.");
      return;
    }

    if (amount > pendingAmount) {
      Alert.alert(
        "Invalid amount",
        `Maximum pending amount is ₹${pendingAmount}.`
      );
      return;
    }

    try {
      setSavingPayment(true);

      await api.post(`/fees/${selectedFee.id}/payments`, {
        amount,
        payment_method: paymentMethod,
      });

      setShowCollect(false);
      setSelectedFee(null);
      setCollectAmount("");
      setPaymentMethod("CASH");

      await reloadFeesKeepPosition();

      Alert.alert("Success", "Payment collected successfully.");
    } catch (error) {
      Alert.alert(
        "Error",
        apiErrorMessage(error, "Unable to collect payment")
      );
    } finally {
      setSavingPayment(false);
    }
  };

  /* =====================================================
     PAYMENT HISTORY
     ===================================================== */

  const openHistory = async (fee: Fee) => {
    setShowHistory(true);
    setHistoryFee(fee);
    setLoadingHistory(true);

    try {
      // GET /fees/:id returns fee.to_dict(include_payments=True)
      const response = await api.get<Fee>(`/fees/${fee.id}`);

      if (response.data) {
        setHistoryFee(response.data);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        apiErrorMessage(error, "Unable to load payment history")
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistory = () => {
    setShowHistory(false);
    setHistoryFee(null);
  };

  const formatPaymentDate = (value: string) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPaymentMethod = (method: string) => {
    if (method === "BANK_TRANSFER") return "BANK TRANSFER";
    return method;
  };

  /* =====================================================
     STATUS
     ===================================================== */

  const renderStatus = (fee: Fee | null) => {
    if (!fee) {
      return (
        <View style={[styles.statusBadge, styles.notSetBadge]}>
          <Text style={[styles.statusText, styles.notSetText]}>NOT SET</Text>
        </View>
      );
    }

    const status = String(fee.status).toUpperCase();

    if (status === "PAID") {
      return (
        <View style={[styles.statusBadge, styles.paidBadge]}>
          <Text style={[styles.statusText, styles.paidText]}>PAID</Text>
        </View>
      );
    }

    if (status === "PARTIAL") {
      return (
        <View style={[styles.statusBadge, styles.partialBadge]}>
          <Text style={[styles.statusText, styles.partialText]}>PARTIAL</Text>
        </View>
      );
    }

    // A fee_amount of 0 (set via "Free") still comes back with a status
    // like PAID from the backend once balance is 0, so this PENDING
    // fallback only shows for a genuine unpaid balance.
    return (
      <View style={[styles.statusBadge, styles.pendingBadge]}>
        <Text style={[styles.statusText, styles.pendingText]}>PENDING</Text>
      </View>
    );
  };

  /* =====================================================
     UI
     ===================================================== */

  return (
    <View style={styles.container}>
      <Header title="Fees" />

      <ScrollView
        ref={feesScrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          feesScrollPosition.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* MONTH */}

        <View style={styles.monthRow}>
          <Pressable style={styles.monthButton} onPress={previousMonth}>
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>

          <View style={styles.monthCenter}>
            <Text style={styles.monthTitle}>{monthName}</Text>
            <Text style={styles.monthSubtitle}>Individual Player Fees</Text>
          </View>

          <Pressable style={styles.monthButton} onPress={nextMonth}>
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>

        {/* CATEGORY */}

        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((category) => {
              const selected = selectedCategoryId === category.id;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                  style={[
                    styles.categoryChip,
                    selected && styles.categoryChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* SUMMARY */}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL</Text>
            <Text style={styles.summaryValue}>
              ₹{summary.total.toLocaleString()}
            </Text>
            <Text style={styles.summarySmall}>
              {summary.feeSetPlayers}/{summary.totalPlayers} fees set
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>COLLECTED</Text>
            <Text style={[styles.summaryValue, styles.greenText]}>
              ₹{summary.collected.toLocaleString()}
            </Text>
            <Text style={styles.summarySmall}>{summary.paidPlayers} paid</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>PENDING</Text>
            <Text style={[styles.summaryValue, styles.redText]}>
              ₹{summary.pending.toLocaleString()}
            </Text>
            <Text style={styles.summarySmall}>
              {summary.pendingPlayers + summary.partialPlayers} players
            </Text>
          </View>
        </View>

        {/* NOT SET NOTICE -- now with a one-tap bulk action instead of
            only pointing at each player card individually. */}

        {summary.notSetPlayers > 0 && isAdmin && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              {summary.notSetPlayers} player
              {summary.notSetPlayers > 1 ? "s" : ""} without a fee
            </Text>

            <Text style={styles.noticeText}>
              Set the same amount for all of them in one go, or use SET FEE
              on an individual player card instead.
            </Text>

            <Pressable
              style={styles.bulkSetButton}
              onPress={openBulkSetFee}
            >
              <Text style={styles.bulkSetButtonText}>
                SET FEE FOR ALL {summary.notSetPlayers}
              </Text>
            </Pressable>
          </View>
        )}

        {/* LOADING */}

        {loading && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* EMPTY */}

        {!loading && rows.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active players</Text>
            <Text style={styles.emptyText}>
              No players found in this category.
            </Text>
          </View>
        )}

        {/* PLAYER LIST */}

        {!loading &&
          rows.map(({ player, fee }) => {
            const playerName = player.player_name || "Player";
            const hasFee = !!fee;
            const pending = Number(fee?.balance || 0);
            const isFreeFee = hasFee && Number(fee?.fee_amount || 0) === 0;

            return (
              <View key={player.id} style={styles.feeCard}>
                {/* PLAYER */}

                <View style={styles.playerRow}>
                  <View style={styles.playerIcon}>
                    <Text style={styles.playerIconText}>
                      {playerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName} numberOfLines={1}>
                      {playerName}
                    </Text>
                    <Text style={styles.playerId}>{player.player_id}</Text>
                  </View>

                  {renderStatus(fee)}
                </View>

                <View style={styles.divider} />

                {/* AMOUNTS */}

                <View style={styles.amountRow}>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Fee</Text>
                    <Text
                      style={[
                        styles.amountValue,
                        isFreeFee && styles.freeAmountValue,
                      ]}
                    >
                      {!hasFee
                        ? "Not set"
                        : isFreeFee
                        ? "FREE"
                        : `₹${Number(
                            fee?.fee_amount || 0
                          ).toLocaleString()}`}
                    </Text>
                  </View>

                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Paid</Text>
                    <Text style={[styles.amountValue, styles.greenText]}>
                      ₹{Number(fee?.paid_amount || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Balance</Text>
                    <Text style={[styles.amountValue, styles.redText]}>
                      ₹{pending.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* SET / EDIT FEE */}

                {isAdmin && (
                  <Pressable
                    style={styles.setFeeButton}
                    onPress={() => openSetFee(player, fee)}
                  >
                    <Text style={styles.setFeeButtonText}>
                      {hasFee ? "EDIT FEE" : "SET FEE"}
                    </Text>
                  </Pressable>
                )}

                {/* PAYMENT HISTORY -- visible to admin and coach alike */}

                {hasFee && (
                  <Pressable
                    style={styles.historyButton}
                    onPress={() => openHistory(fee!)}
                  >
                    <Text style={styles.historyButtonText}>
                      PAYMENT HISTORY
                    </Text>
                  </Pressable>
                )}

                {/* COLLECT PAYMENT */}

                {isAdmin && hasFee && pending > 0 && (
                  <Pressable
                    style={styles.collectButton}
                    onPress={() => openCollect(fee!)}
                  >
                    <Text style={styles.collectButtonText}>
                      COLLECT PAYMENT
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
      </ScrollView>

      {/* =================================================
          SET / EDIT FEE MODAL (single player)
          ================================================= */}

      {showSetFee && selectedPlayer && (
        <Modal
          visible={showSetFee}
          transparent
          animationType="slide"
          onRequestClose={closeSetFee}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSetFee} />
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
            <Text style={styles.modalTitle}>
              {feeByPlayer.has(selectedPlayer.id) ? "Edit Fee" : "Set Fee"}
            </Text>

            <Text style={styles.modalPlayer}>
              {selectedPlayer.player_name}
            </Text>

            <Text style={styles.modalPlayerId}>
              {selectedPlayer.player_id}
            </Text>

            <Text style={styles.inputLabel}>Monthly Fee Amount</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.currency}>₹</Text>

              <TextInput
                value={feeAmountInput}
                onChangeText={setFeeAmountInput}
                keyboardType="numeric"
                placeholder="Enter fee amount"
                placeholderTextColor={colors.textMuted}
                style={styles.amountInput}
                autoFocus
              />

              <Text style={styles.monthSuffix}>/ month</Text>
            </View>

            {/* QUICK AMOUNT CHIPS -- tap instead of typing */}

            <View style={styles.quickAmountRow}>
              {QUICK_AMOUNTS.map((amount) => {
                const selected = feeAmountInput === String(amount);

                return (
                  <Pressable
                    key={amount}
                    onPress={() => setFeeAmountInput(String(amount))}
                    style={[
                      styles.quickAmountChip,
                      selected && styles.quickAmountChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickAmountChipText,
                        selected && styles.quickAmountChipTextSelected,
                      ]}
                    >
                      ₹{amount}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* FREE BUTTON -- sets amount to 0 in one tap */}

            <Pressable
              style={[
                styles.freeButton,
                feeAmountInput === "0" && styles.freeButtonSelected,
              ]}
              onPress={() => setFeeAmountInput("0")}
            >
              <Text
                style={[
                  styles.freeButtonText,
                  feeAmountInput === "0" && styles.freeButtonTextSelected,
                ]}
              >
                {feeAmountInput === "0" ? "✓ Marked as Free" : "Mark as Free (₹0)"}
              </Text>
            </Pressable>

            <Text style={styles.helperText}>
              This amount applies to {monthName}.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={closeSetFee}
                disabled={savingFee}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.saveButton}
                onPress={submitFee}
                disabled={savingFee}
              >
                <Text style={styles.saveText}>
                  {savingFee ? "Saving..." : "Save Fee"}
                </Text>
              </Pressable>
            </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* =================================================
          SET FEE FOR ALL MODAL (bulk)
          ================================================= */}

      {showBulkSetFee && (
        <Modal
          visible={showBulkSetFee}
          transparent
          animationType="slide"
          onRequestClose={closeBulkSetFee}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeBulkSetFee}
            />
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
            <Text style={styles.modalTitle}>Set Fee for All</Text>

            <Text style={styles.modalPlayer}>
              {playersWithoutFee.length} player
              {playersWithoutFee.length > 1 ? "s" : ""} without a fee this
              month
            </Text>

            <Text style={styles.modalPlayerId}>
              Applies only to players who don't already have a fee set for{" "}
              {monthName}.
            </Text>

            <Text style={styles.inputLabel}>Monthly Fee Amount</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.currency}>₹</Text>

              <TextInput
                value={bulkAmountInput}
                onChangeText={setBulkAmountInput}
                keyboardType="numeric"
                placeholder="Enter fee amount"
                placeholderTextColor={colors.textMuted}
                style={styles.amountInput}
                autoFocus
              />

              <Text style={styles.monthSuffix}>/ month</Text>
            </View>

            <View style={styles.quickAmountRow}>
              {QUICK_AMOUNTS.map((amount) => {
                const selected = bulkAmountInput === String(amount);

                return (
                  <Pressable
                    key={amount}
                    onPress={() => setBulkAmountInput(String(amount))}
                    style={[
                      styles.quickAmountChip,
                      selected && styles.quickAmountChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickAmountChipText,
                        selected && styles.quickAmountChipTextSelected,
                      ]}
                    >
                      ₹{amount}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.freeButton,
                bulkAmountInput === "0" && styles.freeButtonSelected,
              ]}
              onPress={() => setBulkAmountInput("0")}
            >
              <Text
                style={[
                  styles.freeButtonText,
                  bulkAmountInput === "0" && styles.freeButtonTextSelected,
                ]}
              >
                {bulkAmountInput === "0"
                  ? "✓ Marked as Free"
                  : "Mark as Free (₹0)"}
              </Text>
            </Pressable>

            {savingBulkFee && (
              <Text style={styles.helperText}>
                Saving {bulkProgress.done}/{bulkProgress.total}...
              </Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={closeBulkSetFee}
                disabled={savingBulkFee}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.saveButton}
                onPress={submitBulkFee}
                disabled={savingBulkFee || playersWithoutFee.length === 0}
              >
                <Text style={styles.saveText}>
                  {savingBulkFee ? "Saving..." : "Apply to All"}
                </Text>
              </Pressable>
            </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* =================================================
          COLLECT PAYMENT MODAL
          ================================================= */}

      {showCollect && selectedFee && (
        <Modal
          visible={showCollect}
          transparent
          animationType="slide"
          onRequestClose={closeCollect}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeCollect} />
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
            <Text style={styles.modalTitle}>Collect Payment</Text>

            <Text style={styles.modalPlayer}>
              {selectedFee.player_name || `Player #${selectedFee.player_id}`}
            </Text>

            <Text style={styles.modalPending}>
              Pending: ₹{Number(selectedFee.balance || 0).toLocaleString()}
            </Text>

            <Text style={styles.inputLabel}>Amount</Text>

            <TextInput
              value={collectAmount}
              onChangeText={setCollectAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor={colors.textMuted}
              style={styles.amountInputSimple}
            />

            <Text style={styles.inputLabel}>Payment Method</Text>

            <View style={styles.paymentMethods}>
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method;

                return (
                  <Pressable
                    key={method}
                    onPress={() => setPaymentMethod(method)}
                    style={[
                      styles.paymentMethod,
                      selected && styles.paymentMethodSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        selected && styles.paymentMethodTextSelected,
                      ]}
                    >
                      {method === "BANK_TRANSFER" ? "BANK" : method}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={closeCollect}
                disabled={savingPayment}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.saveButton}
                onPress={submitPayment}
                disabled={savingPayment}
              >
                <Text style={styles.saveText}>
                  {savingPayment ? "Saving..." : "Collect"}
                </Text>
              </Pressable>
            </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* =================================================
          PAYMENT HISTORY MODAL
          ================================================= */}

      {showHistory && historyFee && (
        <Modal
          visible={showHistory}
          transparent
          animationType="slide"
          onRequestClose={closeHistory}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeHistory} />
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
            <Text style={styles.modalTitle}>Payment History</Text>

            <Text style={styles.modalPlayer}>
              {historyFee.player_name || `Player #${historyFee.player_id}`}
            </Text>

            <Text style={styles.modalPlayerId}>{historyFee.month}</Text>

            {loadingHistory && (
              <Text style={styles.loadingText}>Loading...</Text>
            )}

            {!loadingHistory &&
              (!historyFee.payments ||
                historyFee.payments.length === 0) && (
                <Text style={styles.emptyHistoryText}>
                  No payments collected yet for this month.
                </Text>
              )}

            {!loadingHistory &&
              historyFee.payments &&
              historyFee.payments.length > 0 && (
                <ScrollView style={styles.historyList}>
                  {historyFee.payments.map((payment) => (
                    <View key={payment.id} style={styles.historyItem}>
                      <View style={styles.historyItemLeft}>
                        <Text style={styles.historyAmount}>
                          ₹{Number(payment.amount || 0).toLocaleString()}
                        </Text>

                        <Text style={styles.historyDate}>
                          {formatPaymentDate(payment.payment_date)}
                        </Text>
                      </View>

                      <View style={styles.historyMethodBadge}>
                        <Text style={styles.historyMethodText}>
                          {formatPaymentMethod(payment.payment_method)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}

            <Pressable style={styles.cancelButton} onPress={closeHistory}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  /* MONTH */

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  monthButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  monthButtonText: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 30,
  },

  monthCenter: {
    alignItems: "center",
  },

  monthTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },

  monthSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  /* CATEGORY */

  categoryScroll: {
    gap: 8,
    paddingBottom: 16,
  },

  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  categoryChipTextSelected: {
    color: colors.white,
  },

  /* SUMMARY */

  summaryGrid: {
    gap: 10,
    marginBottom: 12,
  },

  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
  },

  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  summaryValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },

  summarySmall: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  greenText: {
    color: colors.present,
  },

  redText: {
    color: colors.error,
  },

  /* NOTICE */

  noticeCard: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 13,
    marginBottom: 14,
  },

  noticeTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },

  noticeText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  bulkSetButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 12,
  },

  bulkSetButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },

  /* LOADING */

  loadingBox: {
    padding: 20,
    alignItems: "center",
  },

  loadingText: {
    color: colors.textSecondary,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },

  /* FEE CARD */

  feeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  playerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  playerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  playerIconText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900",
  },

  playerInfo: {
    flex: 1,
  },

  playerName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },

  playerId: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },

  /* STATUS */

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  paidBadge: {
    backgroundColor: colors.presentSoft,
  },

  partialBadge: {
    backgroundColor: colors.unmarkedSoft,
  },

  pendingBadge: {
    backgroundColor: colors.absentSoft,
  },

  notSetBadge: {
    backgroundColor: colors.cardBorder,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },

  paidText: {
    color: colors.present,
  },

  partialText: {
    color: colors.unmarked,
  },

  pendingText: {
    color: colors.error,
  },

  notSetText: {
    color: colors.textSecondary,
  },

  /* DIVIDER */

  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 13,
  },

  /* AMOUNTS */

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  amountItem: {
    flex: 1,
  },

  amountLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 3,
  },

  amountValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },

  freeAmountValue: {
    color: colors.present,
    textTransform: "uppercase",
  },

  /* SET FEE */

  setFeeButton: {
    backgroundColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 14,
  },

  setFeeButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },

  /* COLLECT */

  collectButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 8,
  },

  collectButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },

  /* PAYMENT HISTORY */

  historyButton: {
    backgroundColor: "transparent",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },

  historyButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },

  historyList: {
    maxHeight: 280,
    marginBottom: 16,
  },

  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },

  historyItemLeft: {
    flex: 1,
  },

  historyAmount: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },

  historyDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },

  historyMethodBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  historyMethodText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },

  emptyHistoryText: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 18,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },

  modalCard: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  modalScrollContent: {
    paddingBottom: 28,
  },

  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },

  modalPlayer: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },

  modalPlayerId: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    marginBottom: 18,
  },

  modalPending: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18,
  },

  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  currency: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },

  amountInput: {
    flex: 1,
    color: colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: "700",
  },

  amountInputSimple: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 15,
  },

  monthSuffix: {
    color: colors.textMuted,
    fontSize: 11,
  },

  /* QUICK AMOUNTS */

  quickAmountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  quickAmountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  quickAmountChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  quickAmountChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  quickAmountChipTextSelected: {
    color: colors.primary,
  },

  /* FREE BUTTON */

  freeButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingVertical: 12,
    alignItems: "center",
  },

  freeButtonSelected: {
    backgroundColor: colors.presentSoft,
    borderColor: colors.present,
  },

  freeButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },

  freeButtonTextSelected: {
    color: colors.present,
  },

  helperText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 12,
    marginBottom: 20,
  },

  /* PAYMENT METHODS */

  paymentMethods: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },

  paymentMethod: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: "center",
  },

  paymentMethodSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  paymentMethodText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },

  paymentMethodTextSelected: {
    color: colors.primary,
  },

  /* MODAL ACTIONS */

  modalActions: {
    flexDirection: "row",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },

  cancelText: {
    color: colors.textSecondary,
    fontWeight: "800",
  },

  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
  },

  saveText: {
    color: colors.white,
    fontWeight: "900",
  },
});
