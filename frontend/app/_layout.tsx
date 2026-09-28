import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor={colors.bg} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "fade",
          }}
        >
          <Stack.Screen name="login/index" />
          <Stack.Screen name="dashboard/index" />
          <Stack.Screen name="players/index" />
          <Stack.Screen name="players/[id]" />
          <Stack.Screen name="attendance/index" />
          <Stack.Screen name="fees/index" />
          <Stack.Screen name="fees/[id]" />
          <Stack.Screen name="reports/index" />
          <Stack.Screen name="coaches/index" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="more/index" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
