import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { colors, spacing, radius, typography } from "@/constants/theme";

export interface CategoryOption {
  id: number;
  name: string;
}

interface CategorySelectorProps {
  categories: CategoryOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

// Playmaker FC category order
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

export default function CategorySelector({
  categories,
  selectedId,
  onSelect,
}: CategorySelectorProps) {
  const orderedCategories = [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a.name.trim().toLowerCase());
    const indexB = CATEGORY_ORDER.indexOf(b.name.trim().toLowerCase());

    // Known categories first
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // Any unknown categories go alphabetically at the end
    return a.name.localeCompare(b.name);
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {orderedCategories.map((cat) => {
        const active = cat.id === selectedId;

        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.pillText,
                active && styles.pillTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  pillText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },

  pillTextActive: {
    color: colors.white,
  },
});