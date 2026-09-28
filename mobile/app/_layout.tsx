import React from "react";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";
import BottomNav from "@/components/BottomNav";

function AppLayout() {
  const pathname = usePathname();
  const { user } = useAuth();

  const showBottomNav =
    !!user &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/attendance") ||
      pathname.startsWith("/players") ||
      pathname.startsWith("/fees") ||
      pathname.startsWith("/more"));

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.bg,
          },
          animation: "fade",
        }}
      />

      {showBottomNav && <BottomNav />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar
          style="light"
          backgroundColor={colors.bg}
        />

        <AppLayout />
      </AuthProvider>
    </SafeAreaProvider>
  );
}