import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import { colors, spacing, typography } from "@/constants/theme";

export default function AboutScreen() {
  return (
    <ScreenContainer scroll={false}>
      <Header
        title="About"
        subtitle="Playmaker FC app information"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* =====================================================
            APP BRAND
        ===================================================== */}

        <View style={styles.brandCard}>
          <View style={styles.logoCircle}>
            <Ionicons
              name="football"
              size={48}
              color={colors.primary}
            />
          </View>

          <Text style={styles.appName}>
            PLAYMAKER FC
          </Text>

          <Text style={styles.appSubtitle}>
            Football Academy Management System
          </Text>

          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>
              Version 1.0.0
            </Text>
          </View>
        </View>

        {/* =====================================================
            ABOUT
        ===================================================== */}

        <Text style={styles.sectionTitle}>
          ABOUT THE APP
        </Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons
                name="football-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.title}>
                Football Academy Management
              </Text>

              <Text style={styles.subtitle}>
                Manage players, attendance, fees,
                coaches, categories and academy
                reports from one application.
              </Text>
            </View>
          </View>
        </View>

        {/* =====================================================
            FEATURES
        ===================================================== */}

        <Text style={styles.sectionTitle}>
          FEATURES
        </Text>

        <View style={styles.card}>
          <Feature
            icon="people-outline"
            title="Players"
          />

          <View style={styles.divider} />

          <Feature
            icon="checkmark-circle-outline"
            title="Attendance"
          />

          <View style={styles.divider} />

          <Feature
            icon="cash-outline"
            title="Fees"
          />

          <View style={styles.divider} />

          <Feature
            icon="people-circle-outline"
            title="Coaches"
          />

          <View style={styles.divider} />

          <Feature
            icon="layers-outline"
            title="Categories"
          />

          <View style={styles.divider} />

          <Feature
            icon="bar-chart-outline"
            title="Reports"
          />

          <View style={styles.divider} />

          <Feature
            icon="gift-outline"
            title="Birthday Reminders"
          />

          <View style={styles.divider} />

          <Feature
            icon="cloud-upload-outline"
            title="Backup & Export"
          />
        </View>

        {/* =====================================================
            ACADEMY
        ===================================================== */}

        <Text style={styles.sectionTitle}>
          ACADEMY
        </Text>

        <View style={styles.card}>
          <InfoRow
            icon="business-outline"
            label="Academy"
            value="Playmaker FC"
          />

          <View style={styles.divider} />

          <InfoRow
            icon="location-outline"
            label="Location"
            value="PAP Ground, Gorimedu, Pondicherry"
          />

          <View style={styles.divider} />

          <InfoRow
            icon="call-outline"
            label="Phone"
            value="9789511027"
          />
        </View>

        {/* =====================================================
            COPYRIGHT
        ===================================================== */}

        <View style={styles.footer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={colors.textMuted}
          />

          <Text style={styles.footerText}>
            Playmaker FC Academy Management System
          </Text>

          <Text style={styles.copyright}>
            © 2026 Playmaker FC
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ===============================================================
// FEATURE COMPONENT
// ===============================================================

function Feature({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.smallIconBox}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <Text style={styles.featureTitle}>
        {title}
      </Text>

      <Ionicons
        name="checkmark-circle"
        size={21}
        color="#22C55E"
      />
    </View>
  );
}

// ===============================================================
// INFO ROW
// ===============================================================

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.smallIconBox}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.label}>
          {label}
        </Text>

        <Text style={styles.value}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ===============================================================
// STYLES
// ===============================================================

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },

  brandCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 25,
    alignItems: "center",
    marginTop: spacing.lg,
  },

  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  appName: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 1,
  },

  appSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 7,
  },

  versionBadge: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  versionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  infoRow: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  smallIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  textWrap: {
    flex: 1,
  },

  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },

  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 5,
  },

  label: {
    ...typography.caption,
    color: colors.textMuted,
  },

  value: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    marginTop: 3,
  },

  featureRow: {
    minHeight: 65,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  featureTitle: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: 69,
  },

  footer: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },

  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },

  copyright: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 5,
  },
});