import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
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

export default function CategorySelector({ categories, selectedId, onSelect }: CategorySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {categories.map((cat) => {
        const active = cat.id === selectedId;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...typography.captionBold, color: colors.textSecondary },
  pillTextActive: { color: colors.white },
});
