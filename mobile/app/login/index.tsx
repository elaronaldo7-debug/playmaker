import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import {
  colors,
  spacing,
  radius,
  typography,
} from "@/constants/theme";

export default function LoginScreen() {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Please enter your username and password");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log("LOGIN SCREEN - START");
      console.log("USERNAME:", username.trim());

      await login(username.trim(), password);

      console.log("LOGIN SCREEN - SUCCESS");
    } catch (error) {
      console.log("LOGIN SCREEN - ERROR:", error);

      if (error instanceof Error) {
        console.log("ERROR MESSAGE:", error.message);
        setError(error.message);
      } else {
        console.log("UNKNOWN LOGIN ERROR:", error);
        setError("Login failed. Check the Expo terminal for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brandBlock}>
        <Image
          source={require("@/assets/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.brandTitle}>
          Playmaker FC
        </Text>

        <Text style={styles.brandSubtitle}>
          Academy Management System
        </Text>
      </View>

      <View style={styles.form}>
        {/* Username */}
        <Text style={styles.label}>
          Username
        </Text>

        <View style={styles.inputWrap}>
          <Ionicons
            name="person-outline"
            size={18}
            color={colors.textMuted}
          />

          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {/* Password */}
        <Text
          style={[
            styles.label,
            { marginTop: spacing.lg },
          ]}
        >
          Password
        </Text>

        <View style={styles.inputWrap}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={colors.textMuted}
          />

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            onPress={() =>
              setShowPassword((value) => !value)
            }
            hitSlop={10}
            disabled={loading}
          >
            <Ionicons
              name={
                showPassword
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
            />

            <Text style={styles.error}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Login button */}
        <Button
          label="Login"
          onPress={handleLogin}
          loading={loading}
          style={{
            marginTop: spacing.xl,
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: spacing.xl,
  },

  brandBlock: {
    alignItems: "center",
    marginBottom: spacing.xxl * 1.5,
  },

  logoImage: {
    width: 110,
    height: 110,
    marginBottom: spacing.md,
  },

  brandTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },

  brandSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  form: {},

  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },

  input: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
    padding: 0,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },

  error: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
});