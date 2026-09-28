import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import api, { apiErrorMessage } from "@/services/api";
import { colors, spacing } from "@/constants/theme";

type PasswordFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
};

function PasswordField({
  label,
  value,
  placeholder,
  visible,
  onChangeText,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputWrap}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <TouchableOpacity
          onPress={onToggleVisibility}
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={21}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (loading) return;

    if (!currentPassword.trim()) {
      Alert.alert(
        "Current Password",
        "Please enter your current password."
      );
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert(
        "New Password",
        "Please enter a new password."
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Password Too Short",
        "New password must be at least 6 characters."
      );
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert(
        "Confirm Password",
        "Please confirm your new password."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Passwords Do Not Match",
        "New password and confirm password must be the same."
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        "Invalid Password",
        "New password must be different from your current password."
      );
      return;
    }

    try {
      setLoading(true);

      await api.put("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert(
        "Password Updated",
        "Your password has been changed successfully.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Unable to Change Password",
        apiErrorMessage(
          error,
          "Could not update your password."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <Header
        title="Change Password"
        subtitle="Keep your account secure"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* SECURITY HEADER */}
          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={28}
                color={colors.primary}
              />
            </View>

            <View style={styles.securityText}>
              <Text style={styles.securityTitle}>
                Update your password
              </Text>

              <Text style={styles.securitySubtitle}>
                Use your current password and choose a
                new password with at least 6 characters.
              </Text>
            </View>
          </View>

          {/* FORM */}
          <View style={styles.formCard}>
            <PasswordField
              label="Current Password"
              value={currentPassword}
              placeholder="Enter current password"
              visible={showCurrent}
              onChangeText={setCurrentPassword}
              onToggleVisibility={() =>
                setShowCurrent((value) => !value)
              }
            />

            <PasswordField
              label="New Password"
              value={newPassword}
              placeholder="Enter new password"
              visible={showNew}
              onChangeText={setNewPassword}
              onToggleVisibility={() =>
                setShowNew((value) => !value)
              }
            />

            <PasswordField
              label="Confirm New Password"
              value={confirmPassword}
              placeholder="Re-enter new password"
              visible={showConfirm}
              onChangeText={setConfirmPassword}
              onToggleVisibility={() =>
                setShowConfirm((value) => !value)
              }
            />

            {/* PASSWORD MATCH */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons
                  name={
                    newPassword === confirmPassword
                      ? "checkmark-circle"
                      : "close-circle"
                  }
                  size={18}
                  color={
                    newPassword === confirmPassword
                      ? "#22C55E"
                      : "#EF4444"
                  }
                />

                <Text
                  style={[
                    styles.matchText,
                    {
                      color:
                        newPassword === confirmPassword
                          ? "#22C55E"
                          : "#EF4444",
                    },
                  ]}
                >
                  {newPassword === confirmPassword
                    ? "Passwords match"
                    : "Passwords do not match"}
                </Text>
              </View>
            )}

            {/* SAVE */}
            <TouchableOpacity
              style={[
                styles.changeButton,
                loading && styles.changeButtonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="lock-open-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text style={styles.changeButtonText}>
                    Change Password
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* PASSWORD RULES */}
          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>
              Password requirements
            </Text>

            <Rule text="At least 6 characters" />

            <Rule text="Use a password different from your current password" />

            <Rule text="Keep your password private" />
          </View>

          <Text style={styles.footerText}>
            Playmaker FC • Account Security
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name="checkmark-circle-outline"
        size={17}
        color={colors.primary}
      />

      <Text style={styles.ruleText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
  },

  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    padding: 16,
    marginBottom: spacing.lg,
  },

  securityIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 13,
  },

  securityText: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  securitySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 5,
  },

  formCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    padding: 16,
  },

  fieldWrap: {
    marginBottom: 17,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },

  inputWrap: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  inputIcon: {
    marginLeft: 14,
  },

  input: {
    flex: 1,
    minHeight: 50,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 11,
  },

  eyeButton: {
    width: 48,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -5,
    marginBottom: 16,
    gap: 6,
  },

  matchText: {
    fontSize: 12,
    fontWeight: "600",
  },

  changeButton: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },

  changeButtonDisabled: {
    opacity: 0.65,
  },

  changeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  rulesCard: {
    marginTop: spacing.lg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },

  rulesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },

  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 9,
    gap: 8,
  },

  ruleText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },

  footerText: {
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
});