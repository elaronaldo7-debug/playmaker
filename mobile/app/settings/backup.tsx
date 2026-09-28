import React, { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import { colors, spacing, typography } from "@/constants/theme";
import api from "@/services/api";

type BackupData = {
  players?: any[];
  categories?: any[];
  attendance?: any[];
  fees?: any[];
  coaches?: any[];
  users?: any[];
  [key: string]: any;
};

export default function BackupScreen() {
  const [loading, setLoading] = useState(false);

  const createJsonBackup = async () => {
    if (loading) return;

    try {
      setLoading(true);

      console.log("================================");
      console.log("CREATING JSON BACKUP");
      console.log("================================");

      // ---------------------------------------------------------
      // GET BACKUP DATA FROM BACKEND
      // ---------------------------------------------------------

      const response = await api.get("/backup/json");

      console.log("BACKUP API RESPONSE:", response.data);

      // ---------------------------------------------------------
      // HANDLE STANDARD API ENVELOPE
      //
      // Backend response:
      //
      // {
      //   success: true,
      //   data: {...}
      // }
      // ---------------------------------------------------------

      let backupData: BackupData;

      if (
        response.data &&
        response.data.success === true &&
        response.data.data
      ) {
        backupData = response.data.data;
      } else {
        backupData = response.data;
      }

      // ---------------------------------------------------------
      // ADD BACKUP INFORMATION
      // ---------------------------------------------------------

      const finalBackup = {
        app: "Playmaker FC",
        backup_type: "JSON",
        backup_version: "1.0.0",
        created_at: new Date().toISOString(),

        data: backupData,
      };

      // ---------------------------------------------------------
      // CONVERT TO JSON
      // ---------------------------------------------------------

      const jsonString = JSON.stringify(
        finalBackup,
        null,
        2
      );

      // ---------------------------------------------------------
      // FILE NAME
      // ---------------------------------------------------------

      const date = new Date();

      const year = date.getFullYear();

      const month = String(
        date.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        date.getDate()
      ).padStart(2, "0");

      const hours = String(
        date.getHours()
      ).padStart(2, "0");

      const minutes = String(
        date.getMinutes()
      ).padStart(2, "0");

      const seconds = String(
        date.getSeconds()
      ).padStart(2, "0");

      const fileName =
        `playmaker_fc_backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;

      // ---------------------------------------------------------
      // USE CACHE DIRECTORY
      //
      // documentDirectory can be unavailable in some Expo
      // environments. cacheDirectory is safer for sharing.
      // ---------------------------------------------------------

      const cacheDirectory =
        FileSystem.cacheDirectory;

      if (!cacheDirectory) {
        throw new Error(
          "Device cache directory is unavailable."
        );
      }

      const fileUri =
        `${cacheDirectory}${fileName}`;

      console.log(
        "BACKUP FILE:",
        fileUri
      );

      // ---------------------------------------------------------
      // WRITE JSON FILE
      // ---------------------------------------------------------

      await FileSystem.writeAsStringAsync(
        fileUri,
        jsonString,
        {
          encoding:
            FileSystem.EncodingType.UTF8,
        }
      );

      console.log(
        "JSON FILE CREATED SUCCESSFULLY"
      );

      // ---------------------------------------------------------
      // CHECK SHARING
      // ---------------------------------------------------------

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          "Backup Created",
          `JSON backup created successfully.\n\n${fileName}\n\nSharing is not available on this device.`
        );

        return;
      }

      // ---------------------------------------------------------
      // OPEN ANDROID SHARE / SAVE SHEET
      // ---------------------------------------------------------

      await Sharing.shareAsync(
        fileUri,
        {
          mimeType:
            "application/json",
          dialogTitle:
            "Save Playmaker FC Backup",
          UTI:
            "public.json",
        }
      );

      console.log(
        "BACKUP SHARING COMPLETED"
      );
    } catch (error: any) {
      console.log(
        "================================"
      );

      console.log(
        "BACKUP ERROR:",
        error
      );

      console.log(
        "STATUS:",
        error?.response?.status
      );

      console.log(
        "ERROR DATA:",
        error?.response?.data
      );

      console.log(
        "================================"
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create backup.";

      Alert.alert(
        "Backup Failed",
        message
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // BACKUP ITEM
  // -------------------------------------------------------------

  const BackupItem = ({
    icon,
    title,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
  }) => {
    return (
      <View style={styles.dataItem}>
        <View style={styles.dataIcon}>
          <Ionicons
            name={icon}
            size={21}
            color={colors.primary}
          />
        </View>

        <Text style={styles.dataTitle}>
          {title}
        </Text>

        <View style={styles.checkCircle}>
          <Ionicons
            name="checkmark"
            size={16}
            color="#ffffff"
          />
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <Header
        title="Backup & Export"
        subtitle="Backup your academy data"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >
        {/* =====================================================
            JSON BACKUP CARD
        ===================================================== */}

        <View style={styles.mainCard}>
          {/* ICON */}

          <View style={styles.bigIconBox}>
            <Ionicons
              name="cloud-upload-outline"
              size={48}
              color={colors.primary}
            />
          </View>

          {/* TITLE */}

          <Text style={styles.mainTitle}>
            JSON Backup
          </Text>

          {/* DESCRIPTION */}

          <Text style={styles.description}>
            Create a complete backup of your
            Playmaker FC academy data in JSON
            format.
          </Text>

          {/* ===================================================
              INCLUDED DATA
          =================================================== */}

          <View style={styles.dataList}>
            <BackupItem
              icon="people-outline"
              title="Players"
            />

            <BackupItem
              icon="layers-outline"
              title="Categories"
            />

            <BackupItem
              icon="calendar-outline"
              title="Attendance"
            />

            <BackupItem
              icon="cash-outline"
              title="Fees"
            />

            <BackupItem
              icon="person-outline"
              title="Coaches"
            />

            <BackupItem
              icon="shield-checkmark-outline"
              title="Users"
            />
          </View>

          {/* ===================================================
              CREATE BACKUP BUTTON
          =================================================== */}

          <TouchableOpacity
            style={[
              styles.backupButton,
              loading &&
                styles.backupButtonDisabled,
            ]}
            onPress={createJsonBackup}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />

                <Text
                  style={
                    styles.backupButtonText
                  }
                >
                  Creating Backup...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="download-outline"
                  size={24}
                  color="#ffffff"
                />

                <Text
                  style={
                    styles.backupButtonText
                  }
                >
                  Create JSON Backup
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* =====================================================
            INFORMATION
        ===================================================== */}

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={colors.textMuted}
            />
          </View>

          <Text style={styles.infoText}>
            The backup contains your academy
            data in JSON format. After creating
            the backup, use the Android sharing
            options to save it to your device,
            Google Drive, or another location.
          </Text>
        </View>

        {/* =====================================================
            WARNING
        ===================================================== */}

        <View style={styles.warningBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={23}
            color="#22C55E"
          />

          <Text style={styles.warningText}>
            Keep your backup file in a safe
            location. It can be used to restore
            your academy data later.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ===============================================================
// STYLES
// ===============================================================

const styles = StyleSheet.create({
  content: {
    paddingHorizontal:
      spacing.lg,

    paddingBottom: 120,
  },

  // -------------------------------------------------------------
  // MAIN CARD
  // -------------------------------------------------------------

  mainCard: {
    backgroundColor:
      colors.card,

    borderRadius: 18,

    borderWidth: 1,

    borderColor:
      colors.cardBorder,

    padding: 20,

    marginTop: spacing.lg,
  },

  // -------------------------------------------------------------
  // BIG ICON
  // -------------------------------------------------------------

  bigIconBox: {
    width: 78,

    height: 78,

    borderRadius: 20,

    backgroundColor:
      "rgba(239,68,68,0.10)",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 22,
  },

  // -------------------------------------------------------------
  // TITLE
  // -------------------------------------------------------------

  mainTitle: {
    ...typography.h2,

    color:
      colors.textPrimary,

    fontWeight: "700",

    marginBottom: 8,
  },

  // -------------------------------------------------------------
  // DESCRIPTION
  // -------------------------------------------------------------

  description: {
    ...typography.body,

    color:
      colors.textMuted,

    lineHeight: 24,

    marginBottom: 22,
  },

  // -------------------------------------------------------------
  // DATA LIST
  // -------------------------------------------------------------

  dataList: {
    backgroundColor:
      "rgba(0,0,0,0.08)",

    borderRadius: 14,

    overflow: "hidden",

    marginBottom: 20,
  },

  dataItem: {
    minHeight: 58,

    paddingHorizontal: 12,

    flexDirection: "row",

    alignItems: "center",

    borderBottomWidth:
      StyleSheet.hairlineWidth,

    borderBottomColor:
      colors.cardBorder,
  },

  dataIcon: {
    width: 40,

    height: 40,

    borderRadius: 11,

    backgroundColor:
      "rgba(255,255,255,0.05)",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 12,
  },

  dataTitle: {
    flex: 1,

    ...typography.body,

    color:
      colors.textPrimary,

    fontWeight: "600",
  },

  checkCircle: {
    width: 25,

    height: 25,

    borderRadius: 13,

    backgroundColor:
      "#22C55E",

    alignItems: "center",

    justifyContent: "center",
  },

  // -------------------------------------------------------------
  // BACKUP BUTTON
  // -------------------------------------------------------------

  backupButton: {
    minHeight: 58,

    borderRadius: 16,

    backgroundColor:
      colors.primary,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 10,

    paddingHorizontal: 18,
  },

  backupButtonDisabled: {
    opacity: 0.65,
  },

  backupButtonText: {
    color: "#ffffff",

    fontSize: 17,

    fontWeight: "700",
  },

  // -------------------------------------------------------------
  // INFO
  // -------------------------------------------------------------

  infoBox: {
    flexDirection: "row",

    alignItems: "flex-start",

    marginTop: spacing.lg,

    paddingHorizontal: 6,
  },

  infoIcon: {
    marginRight: 10,

    paddingTop: 1,
  },

  infoText: {
    flex: 1,

    ...typography.body,

    color:
      colors.textMuted,

    lineHeight: 23,
  },

  // -------------------------------------------------------------
  // WARNING
  // -------------------------------------------------------------

  warningBox: {
    flexDirection: "row",

    alignItems: "flex-start",

    backgroundColor:
      "rgba(34,197,94,0.08)",

    borderWidth: 1,

    borderColor:
      "rgba(34,197,94,0.18)",

    borderRadius: 14,

    padding: 14,

    marginTop: spacing.lg,
  },

  warningText: {
    flex: 1,

    marginLeft: 10,

    color:
      colors.textMuted,

    fontSize: 13,

    lineHeight: 20,
  },
});