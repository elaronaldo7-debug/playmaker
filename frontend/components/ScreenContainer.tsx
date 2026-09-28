import React from "react";
import { View, StyleSheet, RefreshControl, ScrollView, ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import BottomNavigation from "@/components/BottomNavigation";

interface ScreenContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function ScreenContainer({
  children,
  showBottomNav = true,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  ...rest
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.body}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              ) : undefined
            }
            {...rest}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.flexContent}>{children}</View>
        )}
      </View>
      {showBottomNav ? <BottomNavigation /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  flexContent: { flex: 1, paddingHorizontal: 16 },
});
