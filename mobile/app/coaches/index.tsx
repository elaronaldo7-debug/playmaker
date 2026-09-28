import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";

import { listCoaches, createCoach, updateCoach, deleteCoach } from "@/services/coaches";
import { listCategories } from "@/services/categories";
import { apiErrorMessage } from "@/services/api";

import { Coach } from "@/types";

import {
  colors,
  spacing,
  radius,
  typography,
} from "@/constants/theme";

interface CategoryItem {
  id: number;
  name: string;
}

export default function CoachesScreen() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /* =========================================================
     MODAL
  ========================================================= */

  const [modalVisible, setModalVisible] = useState(false);

  const [editingCoach, setEditingCoach] =
    useState<Coach | null>(null);

  /* =========================================================
     FORM
  ========================================================= */

  const [coachName, setCoachName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number | null>(null);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [coachData, categoryData] =
        await Promise.all([
          listCoaches(),
          listCategories(true),
        ]);

      setCoaches(coachData);

      setCategories(
        categoryData.map((category) => ({
          id: category.id,
          name: category.name,
        }))
      );
    } catch (e) {
      setError(
        apiErrorMessage(
          e,
          "Could not load coaches"
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =========================================================
     OPEN ADD
  ========================================================= */

  const openAddCoach = () => {
    setEditingCoach(null);

    setCoachName("");
    setUsername("");
    setPassword("");
    setSelectedCategoryId(null);

    setError(null);
    setModalVisible(true);
  };

  /* =========================================================
     OPEN EDIT
  ========================================================= */

  const openEditCoach = (coach: Coach) => {
    setEditingCoach(coach);

    setCoachName(coach.coach_name || "");
    setUsername(coach.username || "");
    setPassword("");
    setSelectedCategoryId(
      coach.category_id ?? null
    );

    setError(null);
    setModalVisible(true);
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);

    setEditingCoach(null);

    setCoachName("");
    setUsername("");
    setPassword("");
    setSelectedCategoryId(null);

    setError(null);
  };

  /* =========================================================
     SAVE COACH
  ========================================================= */

  const handleSave = async () => {
    const cleanName = coachName.trim();
    const cleanUsername = username.trim();

    if (!cleanName) {
      setError("Coach name is required");
      return;
    }

    if (!editingCoach && !cleanUsername) {
      setError("User ID is required");
      return;
    }

    if (!editingCoach && !password) {
      setError("Password is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingCoach) {
        await updateCoach(
          editingCoach.id,
          {
            coach_name: cleanName,
            category_id:
              selectedCategoryId ?? undefined,
            ...(password.trim()
              ? {
                  password: password.trim(),
                }
              : {}),
          }
        );
      } else {
        await createCoach({
          username: cleanUsername,
          password: password.trim(),
          coach_name: cleanName,
          category_id:
            selectedCategoryId ?? undefined,
        });
      }

      setModalVisible(false);

      setEditingCoach(null);

      setCoachName("");
      setUsername("");
      setPassword("");
      setSelectedCategoryId(null);

      await loadData();
    } catch (e) {
      setError(
        apiErrorMessage(
          e,
          editingCoach
            ? "Could not update coach"
            : "Could not create coach"
        )
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DISABLE COACH
  ========================================================= */

  const handleDisable = async (
    coach: Coach
  ) => {
    if (!coach.is_active) return;

    setSaving(true);
    setError(null);

    try {
      await deleteCoach(coach.id);
      await loadData();
    } catch (e) {
      setError(
        apiErrorMessage(
          e,
          "Could not disable coach"
        )
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     REACTIVATE / UPDATE STATUS
  ========================================================= */

  const handleToggleActive = async (
    coach: Coach
  ) => {
    setSaving(true);
    setError(null);

    try {
      await updateCoach(
        coach.id,
        {
          is_active: !coach.is_active,
        }
      );

      await loadData();
    } catch (e) {
      setError(
        apiErrorMessage(
          e,
          "Could not update coach status"
        )
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <ScreenContainer>
        <Header
          title="Coaches"
          subtitle="Manage academy coaches"
        />

        <View style={styles.loadingBox}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Loading coaches...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <ScreenContainer
      contentContainerStyle={
        styles.container
      }
    >
      <Header
        title="Coaches"
        subtitle="Manage academy coaches"
      />

      {/* =====================================================
          TOP ACTION
      ===================================================== */}

      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddCoach}
        activeOpacity={0.8}
      >
        <Ionicons
          name="add"
          size={22}
          color={colors.white}
        />

        <Text style={styles.addButtonText}>
          ADD COACH
        </Text>
      </TouchableOpacity>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={colors.absent}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {/* =====================================================
          EMPTY
      ===================================================== */}

      {coaches.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons
            name="people-outline"
            size={42}
            color={colors.textMuted}
          />

          <Text style={styles.emptyTitle}>
            No coaches
          </Text>

          <Text style={styles.emptyText}>
            Add a coach to assign them to an academy category.
          </Text>
        </View>
      ) : (
        <View style={styles.coachList}>
          {coaches.map((coach) => (
            <CoachCard
              key={coach.id}
              coach={coach}
              onEdit={() =>
                openEditCoach(coach)
              }
              onDisable={() =>
                handleDisable(coach)
              }
              onToggleActive={() =>
                handleToggleActive(coach)
              }
              busy={saving}
            />
          ))}
        </View>
      )}

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Modal Header */}

              <View style={styles.modalHeader}>
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {editingCoach
                      ? "Edit Coach"
                      : "Add Coach"}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editingCoach
                      ? "Update coach details"
                      : "Create a coach login account"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Ionicons
                    name="close"
                    size={25}
                    color={
                      colors.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Coach Name */}

              <Text style={styles.fieldLabel}>
                Coach Name
              </Text>

              <TextInput
                value={coachName}
                onChangeText={setCoachName}
                placeholder="Enter coach name"
                placeholderTextColor={
                  colors.textMuted
                }
                style={styles.input}
                editable={!saving}
              />

              {/* User ID */}

              <Text style={styles.fieldLabel}>
                User ID
              </Text>

              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter login user ID"
                placeholderTextColor={
                  colors.textMuted
                }
                style={[
                  styles.input,
                  editingCoach &&
                    styles.disabledInput,
                ]}
                editable={
                  !editingCoach &&
                  !saving
                }
                autoCapitalize="none"
              />

              {/* Password */}

              <Text style={styles.fieldLabel}>
                {editingCoach
                  ? "New Password (optional)"
                  : "Password"}
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={
                  editingCoach
                    ? "Leave empty to keep current password"
                    : "Enter password"
                }
                placeholderTextColor={
                  colors.textMuted
                }
                style={styles.input}
                editable={!saving}
                secureTextEntry
              />

              {/* Category */}

              <Text style={styles.fieldLabel}>
                Assigned Category
              </Text>

              <View
                style={
                  styles.categoryList
                }
              >
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    selectedCategoryId ===
                      null &&
                      styles.categoryButtonActive,
                  ]}
                  onPress={() =>
                    setSelectedCategoryId(
                      null
                    )
                  }
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategoryId ===
                        null &&
                        styles.categoryButtonTextActive,
                    ]}
                  >
                    No Category
                  </Text>
                </TouchableOpacity>

                {categories.map(
                  (category) => {
                    const selected =
                      selectedCategoryId ===
                      category.id;

                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryButton,
                          selected &&
                            styles.categoryButtonActive,
                        ]}
                        onPress={() =>
                          setSelectedCategoryId(
                            category.id
                          )
                        }
                        disabled={saving}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            selected &&
                              styles.categoryButtonTextActive,
                          ]}
                        >
                          {category.name}
                        </Text>

                        {selected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={
                              colors.primary
                            }
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              {/* Modal Error */}

              {error && (
                <View
                  style={
                    styles.modalError
                  }
                >
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {error}
                  </Text>
                </View>
              )}

              {/* Actions */}

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelButton
                  }
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    CANCEL
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.saveButton
                  }
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        colors.white
                      }
                    />
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      {editingCoach
                        ? "UPDATE"
                        : "CREATE"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

/* =========================================================
   COACH CARD
========================================================= */

function CoachCard({
  coach,
  onEdit,
  onDisable,
  onToggleActive,
  busy,
}: {
  coach: Coach;
  onEdit: () => void;
  onDisable: () => void;
  onToggleActive: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.coachCard}>
      {/* Top */}

      <View style={styles.coachTop}>
        <View style={styles.coachIcon}>
          <Ionicons
            name="person"
            size={23}
            color={colors.primary}
          />
        </View>

        <View style={styles.coachInfo}>
          <Text
            style={styles.coachName}
            numberOfLines={1}
          >
            {coach.coach_name}
          </Text>

          <Text
            style={styles.username}
            numberOfLines={1}
          >
            User ID: {coach.username}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            coach.is_active
              ? styles.activeBadge
              : styles.inactiveBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              coach.is_active
                ? styles.activeText
                : styles.inactiveText,
            ]}
          >
            {coach.is_active
              ? "ACTIVE"
              : "INACTIVE"}
          </Text>
        </View>
      </View>

      {/* Category */}

      <View style={styles.categoryRow}>
        <Ionicons
          name="football-outline"
          size={18}
          color={colors.textMuted}
        />

        <Text
          style={styles.categoryText}
          numberOfLines={1}
        >
          {coach.category_name ||
            "No category assigned"}
        </Text>
      </View>

      {/* Actions */}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          disabled={busy}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={colors.info}
          />

          <Text
            style={styles.editButtonText}
          >
            EDIT
          </Text>
        </TouchableOpacity>

        {coach.is_active ? (
          <TouchableOpacity
            style={styles.disableButton}
            onPress={onDisable}
            disabled={busy}
          >
            <Ionicons
              name="person-remove-outline"
              size={18}
              color={colors.absent}
            />

            <Text
              style={
                styles.disableButtonText
              }
            >
              DISABLE
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.enableButton}
            onPress={onToggleActive}
            disabled={busy}
          >
            <Ionicons
              name="person-add-outline"
              size={18}
              color={colors.present}
            />

            <Text
              style={
                styles.enableButtonText
              }
            >
              ACTIVATE
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    paddingBottom:
      spacing.xxl * 2,
  },

  /* Loading */

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  /* Add */

  addButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },

  addButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },

  /* Error */

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.absentSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  errorText: {
    ...typography.caption,
    color: colors.absent,
    flex: 1,
  },

  /* Empty */

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    paddingHorizontal: spacing.xl,
  },

  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },

  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  /* List */

  coachList: {
    gap: spacing.sm,
  },

  /* Coach Card */

  coachCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  coachTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  coachIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  coachInfo: {
    flex: 1,
    minWidth: 0,
  },

  coachName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },

  username: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: spacing.sm,
  },

  activeBadge: {
    backgroundColor: colors.presentSoft,
  },

  inactiveBadge: {
    backgroundColor: colors.absentSoft,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  activeText: {
    color: colors.present,
  },

  inactiveText: {
    color: colors.absent,
  },

  /* Category */

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },

  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },

  /* Card actions */

  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  editButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.info,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  editButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.info,
  },

  disableButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.absent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  disableButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.absent,
  },

  enableButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.present,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  enableButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.present,
  },

  /* Modal */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },

  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  modalSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },

  /* Form */

  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },

  input: {
    height: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },

  disabledInput: {
    opacity: 0.55,
  },

  /* Category selector */

  categoryList: {
    gap: spacing.xs,
  },

  categoryButton: {
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  categoryButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  categoryButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
  },

  categoryButtonTextActive: {
    color: colors.primary,
  },

  /* Modal error */

  modalError: {
    backgroundColor: colors.absentSoft,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },

  /* Modal buttons */

  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
  },

  saveButton: {
    flex: 1,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
});