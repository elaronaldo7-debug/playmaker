import React, { useEffect, useRef, useState } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "@/constants/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  debounceMs?: number;
  onDebouncedChange?: (text: string) => void;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search by name or player ID",
  onClear,
  debounceMs = 250,
  onDebouncedChange,
}: SearchBarProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => setLocalValue(value), [value]);

  const handleChange = (text: string) => {
    setLocalValue(text);
    onChangeText(text);
    if (onDebouncedChange) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onDebouncedChange(text), debounceMs);
    }
  };

  const handleClear = () => {
    setLocalValue("");
    onChangeText("");
    onDebouncedChange?.("");
    onClear?.();
  };

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={colors.textMuted} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {localValue.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, color: colors.textPrimary, ...typography.body, padding: 0 },
});
