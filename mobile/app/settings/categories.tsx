import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import { api, apiErrorMessage } from "@/services/api";
import { colors, spacing, radius, typography } from "@/constants/theme";

// ==================================================
// TYPES
// ==================================================

type Category = {
  id: number;
  name: string;
  is_active?: boolean;
};

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

export default function CategoriesScreen() {
  const router = useRouter();

  // ==================================================
  // STATES
  // ==================================================

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [newCategoryName, setNewCategoryName] =
    useState("");

  const [adding, setAdding] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  // ==================================================
  // MESSAGE
  // ==================================================

  const showMessage = (
    title: string,
    message: string
  ) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  };

  // ==================================================
  // SORT CATEGORIES
  // ==================================================

  const sortCategories = (
    list: Category[]
  ) => {
    return [...list].sort((a, b) => {
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

      if (safeA !== safeB) {
        return safeA - safeB;
      }

      return a.name.localeCompare(b.name);
    });
  };

  // ==================================================
  // LOAD CATEGORIES
  // ==================================================

  const loadCategories = useCallback(
    async () => {
      try {
        setError("");

        const response =
          await api.get("/categories", {
            params: {
              active_only: false,
            },
          });

        const raw = response.data;

        const list: any[] =
          Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.categories)
            ? raw.categories
            : Array.isArray(raw?.data)
            ? raw.data
            : [];

        const mapped: Category[] =
          list
            .map((item: any) => ({
              id: Number(item.id),
              name: String(
                item.name ?? ""
              ).trim(),
              is_active:
                item.is_active ??
                item.active ??
                true,
            }))
            .filter(
              (item: Category) =>
                Number.isFinite(item.id) &&
                item.name.length > 0
            );

        setCategories(
          sortCategories(mapped)
        );
      } catch (err) {
        setError(
          apiErrorMessage(
            err,
            "Unable to load categories"
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ==================================================
  // REFRESH
  // ==================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  // ==================================================
  // ADD CATEGORY
  // ==================================================

  const addCategory = async () => {
    const name =
      newCategoryName.trim();

    if (!name) {
      showMessage(
        "Category name required",
        "Please enter a category name."
      );
      return;
    }

    try {
      setAdding(true);
      setError("");

      await api.post(
        "/categories",
        {
          name,
        }
      );

      setNewCategoryName("");

      await loadCategories();

      showMessage(
        "Category added",
        `${name} has been added successfully.`
      );
    } catch (err: any) {
      const status =
        err?.response?.status;

      const message =
        err?.response?.data?.message;

      if (status === 409) {
        showMessage(
          "Category already exists",
          message ||
            "This category already exists."
        );
      } else {
        setError(
          apiErrorMessage(
            err,
            "Unable to add category"
          )
        );
      }
    } finally {
      setAdding(false);
    }
  };

  // ==================================================
  // DELETE CATEGORY
  // ==================================================

  const deleteCategory = (
    category: Category
  ) => {
    if (deletingId !== null) {
      return;
    }

    const performDelete =
      async () => {
        try {
          setDeletingId(
            category.id
          );

          setError("");

          await api.delete(
            `/categories/${category.id}`
          );

          await loadCategories();

          showMessage(
            "Category deleted",
            `${category.name} has been deleted.`
          );
        } catch (err: any) {
          const message =
            err?.response?.data?.message;

          setError(
            message ||
              apiErrorMessage(
                err,
                "Unable to delete category"
              )
          );
        } finally {
          setDeletingId(null);
        }
      };

    if (Platform.OS === "web") {
      const confirmed =
        window.confirm(
          `Delete "${category.name}"?\n\nThis action cannot be undone.`
        );

      if (confirmed) {
        void performDelete();
      }

      return;
    }

    Alert.alert(
      "Delete category",
      `Are you sure you want to delete "${category.name}"?\n\nThis action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void performDelete();
          },
        },
      ]
    );
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <Header
          title="Categories"
          subtitle="Manage player categories"
        />

        <View style={styles.loadingContainer}>
          <Ionicons
            name="layers-outline"
            size={40}
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Loading categories...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <ScreenContainer scroll={false}>
      <Header
        title="Categories"
        subtitle="Manage player categories"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >

        {/* ==========================================
            ADD CATEGORY
        ========================================== */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Add Category
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              Create a new player category
            </Text>
          </View>
        </View>

        <View style={styles.addCard}>
          <TextInput
            value={newCategoryName}
            onChangeText={
              setNewCategoryName
            }
            placeholder="Category name"
            placeholderTextColor={
              colors.textMuted
            }
            style={styles.input}
            autoCapitalize="words"
            editable={!adding}
            onSubmitEditing={
              addCategory
            }
          />

          <TouchableOpacity
            style={[
              styles.addButton,
              adding &&
                styles.disabledButton,
            ]}
            disabled={adding}
            onPress={addCategory}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.addButtonText
              }
            >
              {adding
                ? "Adding..."
                : "Add"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ==========================================
            ERROR
        ========================================== */}

        {error !== "" && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color="#EF4444"
            />

            <Text
              style={styles.errorText}
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
            CATEGORY LIST
        ========================================== */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Categories
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              {categories.length} categories
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons
              name="layers-outline"
              size={44}
              color="#6B7280"
            />

            <Text
              style={styles.emptyTitle}
            >
              No categories found
            </Text>

            <Text
              style={styles.emptyText}
            >
              Add your first player category
              above.
            </Text>
          </View>
        ) : (
          <View style={styles.categoryList}>
            {categories.map(
              (category, index) => {
                const deleting =
                  deletingId ===
                  category.id;

                const active =
                  category.is_active !==
                  false;

                return (
                  <View
                    key={category.id}
                    style={
                      styles.categoryCard
                    }
                  >
                    {/* ICON */}

                    <View
                      style={
                        styles.categoryIcon
                      }
                    >
                      <Ionicons
                        name="layers-outline"
                        size={21}
                        color={
                          colors.primary
                        }
                      />
                    </View>

                    {/* NAME */}

                    <View
                      style={
                        styles.categoryInfo
                      }
                    >
                      <Text
                        style={
                          styles.categoryName
                        }
                      >
                        {category.name}
                      </Text>

                      <View
                        style={
                          styles.categoryMeta
                        }
                      >
                        <View
                          style={[
                            styles.statusDot,
                            active
                              ? styles.statusDotActive
                              : styles.statusDotInactive,
                          ]}
                        />

                        <Text
                          style={
                            styles.categoryStatus
                          }
                        >
                          {active
                            ? "Active"
                            : "Inactive"}
                        </Text>
                      </View>
                    </View>

                    {/* DELETE */}

                    <TouchableOpacity
                      style={[
                        styles.deleteButton,
                        deleting &&
                          styles.disabledButton,
                      ]}
                      disabled={deleting}
                      onPress={() =>
                        deleteCategory(
                          category
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                );
              }
            )}
          </View>
        )}

        {/* ==========================================
            INFO
        ========================================== */}

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={colors.primary}
          />

          <Text style={styles.infoText}>
            Categories are used to organize
            players and attendance by age or
            training group.
          </Text>
        </View>

        {/* ==========================================
            BOTTOM SPACE
        ========================================== */}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  content: {
    paddingHorizontal:
      spacing.lg,
    paddingBottom: 110,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  // ==================================================
  // SECTION
  // ==================================================

  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  // ==================================================
  // ADD
  // ==================================================

  addCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  input: {
    flex: 1,
    height: 46,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },

  addButton: {
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.5,
  },

  // ==================================================
  // ERROR
  // ==================================================

  errorBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: "#35151A",
    borderWidth: 1,
    borderColor: "#7F1D1D",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  errorText: {
    flex: 1,
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
  },

  // ==================================================
  // REFRESH
  // ==================================================

  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  // ==================================================
  // CATEGORY LIST
  // ==================================================

  categoryList: {
    gap: spacing.xs,
  },

  categoryCard: {
    minHeight: 70,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
  },

  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor:
      "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  categoryInfo: {
    flex: 1,
  },

  categoryName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },

  categoryMeta: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  statusDotActive: {
    backgroundColor: "#22C55E",
  },

  statusDotInactive: {
    backgroundColor: "#6B7280",
  },

  categoryStatus: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },

  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor:
      "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor:
      "rgba(239,68,68,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ==================================================
  // EMPTY
  // ==================================================

  emptyBox: {
    minHeight: 180,
    marginTop: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },

  emptyTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },

  // ==================================================
  // INFO
  // ==================================================

  infoBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor:
      "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },

  infoText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },

  bottomSpace: {
    height: 30,
  },
});