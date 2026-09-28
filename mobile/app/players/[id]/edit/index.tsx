import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";

import {
  colors,
  spacing,
  radius,
} from "@/constants/theme";

import api, {
  apiErrorMessage,
} from "@/services/api";

import { Player } from "@/types";


// =====================================================
// API URL
// =====================================================

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  "http://localhost:5000/api";

const API_SERVER_URL =
  API_BASE_URL.replace(/\/api\/?$/, "");


// =====================================================
// IMAGE URL HELPER
// =====================================================

function getPhotoUrl(photo: string | null | undefined) {
  if (!photo) {
    return null;
  }

  // Already full URL
  if (
    photo.startsWith("http://") ||
    photo.startsWith("https://")
  ) {
    return photo;
  }

  // Relative backend path
  return `${API_SERVER_URL}${photo.startsWith("/") ? "" : "/"}${photo}`;
}


// =====================================================
// SCREEN
// =====================================================

export default function EditPlayerScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const router = useRouter();


  // ===================================================
  // STATE
  // ===================================================

  const [player, setPlayer] =
    useState<Player | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);


  // ===================================================
  // FORM STATE
  // ===================================================

  const [playerName, setPlayerName] =
    useState("");

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [school, setSchool] =
    useState("");

  const [standard, setStandard] =
    useState("");

  const [phone1, setPhone1] =
    useState("");

  const [phone2, setPhone2] =
    useState("");

  const [pickupPerson, setPickupPerson] =
    useState("");

  const [healthCondition, setHealthCondition] =
    useState("");

  const [status, setStatus] =
    useState<"ACTIVE" | "INACTIVE">("ACTIVE");


  // ===================================================
  // PHOTO STATE
  // ===================================================

  // Actual selected local URI
  const [photoUri, setPhotoUri] =
    useState<string | null>(null);

  // Backend saved photo path
  const [savedPhotoPath, setSavedPhotoPath] =
    useState<string | null>(null);

  // New photo selected?
  const [newPhotoSelected, setNewPhotoSelected] =
    useState(false);


  // ===================================================
  // LOAD PLAYER
  // ===================================================

  useEffect(() => {
    loadPlayer();
  }, [id]);


  async function loadPlayer() {
    if (!id) {
      return;
    }

    try {
      setLoading(true);

      const { data } =
        await api.get<Player>(
          `/players/${id}`
        );

      setPlayer(data);

      // Form fields
      setPlayerName(
        data.player_name || ""
      );

      setDateOfBirth(
        data.date_of_birth || ""
      );

      setSchool(
        data.school || ""
      );

      setStandard(
        data.standard || ""
      );

      setPhone1(
        data.phone_1 || ""
      );

      setPhone2(
        data.phone_2 || ""
      );

      setPickupPerson(
        data.pickup_person || ""
      );

      setHealthCondition(
        data.health_condition || ""
      );

      setStatus(
        data.status || "ACTIVE"
      );


      // ===============================================
      // PHOTO
      // ===============================================

      if (data.profile_photo) {
        setSavedPhotoPath(
          data.profile_photo
        );

        setPhotoUri(
          getPhotoUrl(
            data.profile_photo
          )
        );
      } else {
        setSavedPhotoPath(null);
        setPhotoUri(null);
      }

      setNewPhotoSelected(false);

    } catch (error) {

      Alert.alert(
        "Error",
        apiErrorMessage(
          error,
          "Could not load player"
        )
      );

    } finally {

      setLoading(false);
    }
  }


  // ===================================================
  // SELECT PHOTO
  // ===================================================

  async function selectPhoto() {
    try {

      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();


      if (!permission.granted) {

        Alert.alert(
          "Permission required",
          "Please allow photo library permission."
        );

        return;
      }


      const result =
        await ImagePicker.launchImageLibraryAsync({

          mediaTypes: ["images"],

          allowsEditing: true,

          aspect: [1, 1],

          quality: 0.8,
        });


      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }


      const asset =
        result.assets[0];


      // Local preview
      setPhotoUri(
        asset.uri
      );

      // Important:
      // This tells savePlayer that a new photo
      // needs to be uploaded.
      setNewPhotoSelected(true);

    } catch (error) {

      Alert.alert(
        "Error",
        "Could not select photo"
      );
    }
  }


  // ===================================================
  // UPLOAD PHOTO
  // ===================================================

  async function uploadPhoto(
    uri: string
  ) {

    if (!id) {
      return null;
    }


    try {

      setUploadingPhoto(true);


      const formData =
        new FormData();


      const filename =
        `player_${id}_${Date.now()}.jpg`;


      // ===============================================
      // WEB
      // ===============================================

      if (Platform.OS === "web") {

        const response =
          await fetch(uri);

        const blob =
          await response.blob();


        formData.append(
          "photo",
          blob,
          filename
        );

      }

      // ===============================================
      // ANDROID / IOS
      // ===============================================

      else {

        formData.append(
          "photo",
          {
            uri,
            name: filename,
            type: "image/jpeg",
          } as any
        );
      }


      // ===============================================
      // SEND PHOTO
      // ===============================================

      const { data } =
        await api.post<Player>(
          `/players/${id}/photo`,
          formData
        );


      // Backend returns updated player
      if (data?.profile_photo) {

        const backendPhoto =
          data.profile_photo;


        setSavedPhotoPath(
          backendPhoto
        );


        setPhotoUri(
          getPhotoUrl(
            backendPhoto
          )
        );
      }


      setNewPhotoSelected(false);


      return data;


    } catch (error) {

      Alert.alert(
        "Photo upload failed",
        apiErrorMessage(
          error,
          "Could not upload profile photo"
        )
      );

      return null;

    } finally {

      setUploadingPhoto(false);
    }
  }


  // ===================================================
  // SAVE PLAYER
  // ===================================================

  async function savePlayer() {

    if (!id) {
      return;
    }


    if (!playerName.trim()) {

      Alert.alert(
        "Required",
        "Player name is required."
      );

      return;
    }


    try {

      setSaving(true);


      // ===============================================
      // 1. UPDATE PLAYER DETAILS
      // ===============================================

      await api.put(
        `/players/${id}`,
        {
          player_name:
            playerName.trim(),

          date_of_birth:
            dateOfBirth.trim() || null,

          school:
            school.trim() || null,

          standard:
            standard.trim() || null,

          phone_1:
            phone1.trim() || null,

          phone_2:
            phone2.trim() || null,

          pickup_person:
            pickupPerson.trim() || null,

          health_condition:
            healthCondition.trim() || null,

          status,
        }
      );


      // ===============================================
      // 2. UPLOAD NEW PHOTO
      // ===============================================

      if (
        newPhotoSelected &&
        photoUri
      ) {

        const uploaded =
          await uploadPhoto(
            photoUri
          );


        if (!uploaded) {

          setSaving(false);

          return;
        }
      }


      // ===============================================
      // 3. SUCCESS
      // ===============================================

      Alert.alert(
        "Saved",
        "Player profile updated successfully.",
        [
          {
            text: "OK",

            onPress: () => {
              router.back();
            },
          },
        ]
      );


    } catch (error) {

      Alert.alert(
        "Save failed",
        apiErrorMessage(
          error,
          "Could not update player"
        )
      );

    } finally {

      setSaving(false);
    }
  }


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {

    return (
      <ScreenContainer>

        <Header
          title="Edit Player"
        />

        <View style={styles.loading}>

          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

        </View>

      </ScreenContainer>
    );
  }


  // ===================================================
  // PLAYER NOT FOUND
  // ===================================================

  if (!player) {

    return (
      <ScreenContainer>

        <Header
          title="Edit Player"
        />

        <View style={styles.loading}>

          <Text style={styles.errorText}>
            Player not found.
          </Text>

        </View>

      </ScreenContainer>
    );
  }


  // ===================================================
  // SCREEN UI
  // ===================================================

  return (

    <ScreenContainer
      scroll={false}
    >

      <Header
        title="Edit Player"
        subtitle={player.player_id}
        leftIcon="arrow-back"
        onLeftPress={() =>
          router.back()
        }
      />


      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >


        {/* =========================================
            PROFILE PHOTO
        ========================================= */}

        <View
          style={styles.photoSection}
        >

          <TouchableOpacity
            style={styles.photoButton}
            onPress={selectPhoto}
            activeOpacity={0.8}
            disabled={
              saving ||
              uploadingPhoto
            }
          >

            {photoUri ? (

              <Image
                source={{
                  uri: photoUri,
                }}
                style={styles.photo}
                resizeMode="cover"
                onError={() => {
                  console.log(
                    "PHOTO LOAD ERROR:",
                    photoUri
                  );
                }}
              />

            ) : (

              <View
                style={
                  styles.photoPlaceholder
                }
              >

                <Ionicons
                  name="person"
                  size={45}
                  color={
                    colors.textMuted
                  }
                />

              </View>
            )}


            {/* CAMERA */}

            <View
              style={styles.cameraButton}
            >

              <Ionicons
                name="camera"
                size={18}
                color={colors.white}
              />

            </View>

          </TouchableOpacity>


          <Text
            style={styles.photoText}
          >
            Tap photo to change
          </Text>


          {uploadingPhoto && (

            <View
              style={
                styles.uploadingRow
              }
            >

              <ActivityIndicator
                size="small"
                color={
                  colors.primary
                }
              />

              <Text
                style={
                  styles.uploadingText
                }
              >
                Uploading photo...
              </Text>

            </View>
          )}

        </View>


        {/* =========================================
            PLAYER NAME
        ========================================= */}

        <Field
          label="Player Name"
          value={playerName}
          onChangeText={
            setPlayerName
          }
          placeholder="Enter player name"
        />


        {/* =========================================
            DOB
        ========================================= */}

        <Field
          label="Date of Birth"
          value={dateOfBirth}
          onChangeText={
            setDateOfBirth
          }
          placeholder="YYYY-MM-DD"
        />


        {/* =========================================
            SCHOOL
        ========================================= */}

        <Field
          label="School"
          value={school}
          onChangeText={
            setSchool
          }
          placeholder="Enter school"
        />


        {/* =========================================
            STANDARD
        ========================================= */}

        <Field
          label="Standard"
          value={standard}
          onChangeText={
            setStandard
          }
          placeholder="Enter standard"
        />


        {/* =========================================
            PHONE 1
        ========================================= */}

        <Field
          label="Phone 1"
          value={phone1}
          onChangeText={
            setPhone1
          }
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />


        {/* =========================================
            PHONE 2
        ========================================= */}

        <Field
          label="Phone 2"
          value={phone2}
          onChangeText={
            setPhone2
          }
          placeholder="Enter second phone number"
          keyboardType="phone-pad"
        />


        {/* =========================================
            PICKUP PERSON
        ========================================= */}

        <Field
          label="Pickup Person"
          value={pickupPerson}
          onChangeText={
            setPickupPerson
          }
          placeholder="Enter pickup person"
        />


        {/* =========================================
            HEALTH
        ========================================= */}

        <Field
          label="Health Condition"
          value={
            healthCondition
          }
          onChangeText={
            setHealthCondition
          }
          placeholder="Enter health condition"
          multiline
        />


        {/* =========================================
            STATUS
        ========================================= */}

        <Text
          style={styles.label}
        >
          Status
        </Text>


        <View
          style={styles.statusRow}
        >

          {/* ACTIVE */}

          <TouchableOpacity
            style={[
              styles.statusButton,

              status === "ACTIVE" &&
                styles.activeSelected,
            ]}
            onPress={() =>
              setStatus("ACTIVE")
            }
          >

            <View
              style={[
                styles.radio,

                status === "ACTIVE" &&
                  styles.radioSelected,
              ]}
            />

            <Text
              style={styles.statusText}
            >
              Active
            </Text>

          </TouchableOpacity>


          {/* INACTIVE */}

          <TouchableOpacity
            style={[
              styles.statusButton,

              status === "INACTIVE" &&
                styles.inactiveSelected,
            ]}
            onPress={() =>
              setStatus("INACTIVE")
            }
          >

            <View
              style={[
                styles.radio,

                status === "INACTIVE" &&
                  styles.radioInactive,
              ]}
            />

            <Text
              style={styles.statusText}
            >
              Inactive
            </Text>

          </TouchableOpacity>

        </View>


        {/* =========================================
            SAVE
        ========================================= */}

        <TouchableOpacity
          style={[
            styles.saveButton,

            saving &&
              styles.saveButtonDisabled,
          ]}
          onPress={
            savePlayer
          }
          disabled={
            saving ||
            uploadingPhoto
          }
          activeOpacity={0.8}
        >

          {saving ? (

            <ActivityIndicator
              color={colors.white}
            />

          ) : (

            <>
              <Ionicons
                name="checkmark"
                size={22}
                color={colors.white}
              />

              <Text
                style={styles.saveText}
              >
                Save Changes
              </Text>
            </>

          )}

        </TouchableOpacity>


        <View
          style={{ height: 40 }}
        />

      </ScrollView>

    </ScreenContainer>
  );
}


// =====================================================
// FIELD COMPONENT
// =====================================================

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;

  value: string;

  onChangeText:
    (text: string) => void;

  placeholder: string;

  keyboardType?:
    | "default"
    | "phone-pad"
    | "numeric";

  multiline?: boolean;
}) {

  return (

    <View
      style={styles.field}
    >

      <Text
        style={styles.label}
      >
        {label}
      </Text>


      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          colors.textMuted
        }
        keyboardType={
          keyboardType ||
          "default"
        }
        multiline={
          multiline
        }
        style={[
          styles.input,

          multiline &&
            styles.multilineInput,
        ]}
      />

    </View>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles =
  StyleSheet.create({

    container: {
      paddingHorizontal:
        spacing.lg,

      paddingBottom:
        spacing.xl,
    },


    loading: {
      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",
    },


    errorText: {
      color:
        colors.textSecondary,

      fontSize: 16,
    },


    // ================================================
    // PHOTO
    // ================================================

    photoSection: {
      alignItems:
        "center",

      marginTop:
        spacing.md,

      marginBottom:
        spacing.xl,
    },


    photoButton: {
      position:
        "relative",
    },


    photo: {
      width: 120,

      height: 120,

      borderRadius: 60,

      backgroundColor:
        colors.card,
    },


    photoPlaceholder: {
      width: 120,

      height: 120,

      borderRadius: 60,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      justifyContent:
        "center",

      alignItems:
        "center",
    },


    cameraButton: {
      position:
        "absolute",

      right: 2,

      bottom: 2,

      width: 36,

      height: 36,

      borderRadius: 18,

      backgroundColor:
        colors.primary,

      justifyContent:
        "center",

      alignItems:
        "center",

      borderWidth: 3,

      borderColor:
        colors.bg,
    },


    photoText: {
      marginTop:
        spacing.sm,

      color:
        colors.textSecondary,

      fontSize: 13,
    },


    uploadingRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop:
        spacing.sm,

      gap: 8,
    },


    uploadingText: {
      color:
        colors.textSecondary,

      fontSize: 13,
    },


    // ================================================
    // FORM
    // ================================================

    field: {
      marginBottom:
        spacing.md,
    },


    label: {
      color:
        colors.textPrimary,

      fontSize: 14,

      fontWeight:
        "600",

      marginBottom: 7,
    },


    input: {
      height: 50,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      borderRadius:
        radius.md,

      paddingHorizontal: 15,

      color:
        colors.textPrimary,

      fontSize: 15,
    },


    multilineInput: {
      height: 90,

      paddingTop: 14,

      textAlignVertical:
        "top",
    },


    // ================================================
    // STATUS
    // ================================================

    statusRow: {
      flexDirection:
        "row",

      gap: 10,

      marginBottom:
        spacing.xl,
    },


    statusButton: {
      flex: 1,

      height: 50,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.cardBorder,

      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal: 15,

      gap: 10,
    },


    activeSelected: {
      borderColor:
        colors.present,
    },


    inactiveSelected: {
      borderColor:
        colors.primary,
    },


    radio: {
      width: 18,

      height: 18,

      borderRadius: 9,

      borderWidth: 2,

      borderColor:
        colors.textMuted,
    },


    radioSelected: {
      borderColor:
        colors.present,

      backgroundColor:
        colors.present,
    },


    radioInactive: {
      borderColor:
        colors.primary,

      backgroundColor:
        colors.primary,
    },


    statusText: {
      color:
        colors.textPrimary,

      fontSize: 14,
    },


    // ================================================
    // SAVE
    // ================================================

    saveButton: {
      height: 54,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.primary,

      flexDirection:
        "row",

      justifyContent:
        "center",

      alignItems:
        "center",

      gap: 8,
    },


    saveButtonDisabled: {
      opacity: 0.6,
    },


    saveText: {
      color:
        colors.white,

      fontSize: 16,

      fontWeight:
        "700",
    },

  });