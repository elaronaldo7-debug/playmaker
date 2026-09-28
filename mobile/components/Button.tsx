import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { colors, spacing, radius, typography } from "@/constants/theme";

type Variant = "primary" | "secondary" | "outline" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  fullWidth = true,
}: ButtonProps) {
  const variantStyle = {
    primary: styles.primary,
    secondary: styles.secondary,
    outline: styles.outline,
    danger: styles.danger,
  }[variant];

  const textStyle = {
    primary: styles.primaryText,
    secondary: styles.secondaryText,
    outline: styles.outlineText,
    danger: styles.primaryText,
  }[variant];

  return (
    <TouchableOpacity
      style={[styles.base, variantStyle, fullWidth && styles.fullWidth, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.primary : colors.white} />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.5 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  danger: { backgroundColor: colors.error },
  primaryText: { ...typography.bodyBold, color: colors.white },
  secondaryText: { ...typography.bodyBold, color: colors.textPrimary },
  outlineText: { ...typography.bodyBold, color: colors.primary },
});
