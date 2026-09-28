import React from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import { colors, spacing } from "@/constants/theme";

export default function AcademyScreen() {
  const academyName = "palymaker fc";
  const location = "PAP Ground, Gorimedu, Pondicherry";
  const phone = "9789511027";

  const handleCall = () => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <ScreenContainer>
      <Header title="Academy Information" />

      <View style={styles.container}>
        {/* ================================
            ACADEMY LOGO
        ================================= */}
        <View style={styles.logoWrapper}>
          <Image
            source={require("../../assets/images/playmaker-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* ================================
            ACADEMY NAME
        ================================= */}
        <Text style={styles.academyName}>
          {academyName}
        </Text>

        <Text style={styles.subtitle}>
          Football Academy
        </Text>

        {/* ================================
            INFORMATION CARD
        ================================= */}
        <View style={styles.card}>
          {/* Academy Name */}
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons
                name="football-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.label}>
                Academy Name
              </Text>

              <Text style={styles.value}>
                {academyName}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Location */}
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons
                name="location-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.label}>
                Location
              </Text>

              <Text style={styles.value}>
                {location}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Phone */}
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons
                name="call-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.label}>
                Phone
              </Text>

              <Text style={styles.value}>
                {phone}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================
            CALL BUTTON
        ================================= */}
        <Pressable
          style={({ pressed }) => [
            styles.callButton,
            pressed && styles.callButtonPressed,
          ]}
          onPress={handleCall}
        >
          <Ionicons
            name="call"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.callButtonText}>
            Call Academy
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /* ================================
     MAIN CONTAINER
  ================================= */
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  /* ================================
     LOGO
  ================================= */
  logoWrapper: {
    width: 150,
    height: 150,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },

  logo: {
    width: 145,
    height: 145,
  },

  /* ================================
     ACADEMY NAME
  ================================= */
  academyName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "capitalize",
    marginTop: 2,
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
    marginBottom: spacing.lg,
  },

  /* ================================
     INFORMATION CARD
  ================================= */
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* ================================
     INFORMATION ROW
  ================================= */
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },

  infoContent: {
    flex: 1,
  },

  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 5,
  },

  value: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 62,
  },

  /* ================================
     CALL BUTTON
  ================================= */
  callButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  callButtonPressed: {
    opacity: 0.8,
  },

  callButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});