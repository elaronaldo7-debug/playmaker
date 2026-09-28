import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

const items = [
  {
    label: "Home",
    icon: "home-outline" as const,
    activeIcon: "home" as const,
    route: "/dashboard",
  },
  {
    label: "Attendance",
    icon: "calendar-outline" as const,
    activeIcon: "calendar" as const,
    route: "/attendance",
  },
  {
    label: "Players",
    icon: "people-outline" as const,
    activeIcon: "people" as const,
    route: "/players",
  },
  {
    label: "Fees",
    icon: "cash-outline" as const,
    activeIcon: "cash" as const,
    route: "/fees",
  },
  {
    label: "More",
    icon: "menu-outline" as const,
    activeIcon: "menu" as const,
    route: "/more",
  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {items.map((item) => {
          const active = pathname.startsWith(item.route);

          return (
            <Pressable
              key={item.label}
              style={styles.navItem}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={23}
                color={active ? colors.primary : colors.textSecondary}
              />

              <Text
                style={[
                  styles.label,
                  active && styles.activeLabel,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "transparent",
  },

  navBar: {
    height: 68,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },

  navItem: {
    flex: 1,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  label: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },

  activeLabel: {
    color: colors.primary,
  },
});