import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import PlayerCard, {
  PlayerListItem,
} from "@/components/PlayerCard";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

import { useAuth } from "@/context/AuthContext";
import {
  canEditPlayers,
} from "@/utils/permissions";

import api, {
  apiErrorMessage,
} from "@/services/api";

import {
  colors,
  spacing,
} from "@/constants/theme";


type PlayerStatus =
  | "ACTIVE"
  | "INACTIVE";


export default function PlayersScreen() {
  const { user } = useAuth();
  const router = useRouter();


  /* ============================================================
     STATE
     ============================================================ */

  const [search, setSearch] =
    useState("");

  const [players, setPlayers] =
    useState<PlayerListItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [status, setStatus] =
    useState<PlayerStatus>("ACTIVE");


  /* ============================================================
     LOAD PLAYERS
     ============================================================ */

  const loadPlayers = useCallback(
    async (
      query: string = search,
      currentStatus: PlayerStatus = status
    ) => {
      setLoading(true);

      try {
        const { data } =
          await api.get(
            "/players",
            {
              params: {
                search:
                  query || undefined,

                status:
                  currentStatus,

                per_page: 200,
              },
            }
          );

        setPlayers(
          data?.players || []
        );

        setError(null);

      } catch (e) {
        setError(
          apiErrorMessage(
            e,
            "Could not load players"
          )
        );

      } finally {
        setLoading(false);
      }
    },
    [search, status]
  );


  /* ============================================================
     INITIAL LOAD
     ============================================================ */

  useEffect(() => {
    loadPlayers(
      "",
      "ACTIVE"
    );
  }, []);


  /* ============================================================
     CHANGE ACTIVE / INACTIVE TAB
     ============================================================ */

  const changeStatusTab = async (
    newStatus: PlayerStatus
  ) => {
    setStatus(newStatus);

    await loadPlayers(
      search,
      newStatus
    );
  };


  /* ============================================================
     OPEN PLAYER PROFILE
     ============================================================ */

  const openPlayer = (
    player: PlayerListItem
  ) => {
    router.push(
      `/players/${player.id}` as any
    );
  };


  /* ============================================================
     RENDER PLAYER
     ============================================================ */

  const renderPlayer = ({
    item,
  }: {
    item: PlayerListItem;
  }) => {
    return (
      <View
        style={styles.playerWrapper}
      >
        <PlayerCard
          player={item}
          onPress={() =>
            openPlayer(item)
          }
        />
      </View>
    );
  };


  /* ============================================================
     SCREEN
     ============================================================ */

  return (
    <ScreenContainer
      scroll={false}
    >

      {/* ======================================================
          HEADER
          ====================================================== */}

      <Header
        title="Players"
        subtitle={
          status === "ACTIVE"
            ? "Active Players"
            : "Inactive Players"
        }
        rightIcon={
          canEditPlayers(user)
            ? "add"
            : undefined
        }
        onRightPress={() =>
          router.push(
            "/players/new" as any
          )
        }
      />


      {/* ======================================================
          SEARCH
          ====================================================== */}

      <View
        style={styles.searchWrap}
      >
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onDebouncedChange={(
            query
          ) =>
            loadPlayers(
              query,
              status
            )
          }
          placeholder="Search by name or player ID"
        />
      </View>


      {/* ======================================================
          ACTIVE / INACTIVE TABS
          ====================================================== */}

      <View
        style={
          styles.tabsContainer
        }
      >

        {/* ACTIVE */}

        <TouchableOpacity
          style={[
            styles.tab,
            status === "ACTIVE" &&
              styles.activeTab,
          ]}
          onPress={() =>
            changeStatusTab(
              "ACTIVE"
            )
          }
          activeOpacity={0.8}
        >

          <Ionicons
            name="people-outline"
            size={18}
            color={
              status === "ACTIVE"
                ? colors.primary
                : colors.textMuted
            }
          />

          <Text
            style={[
              styles.tabText,
              status === "ACTIVE" &&
                styles.activeTabText,
            ]}
          >
            Active
          </Text>

        </TouchableOpacity>


        {/* INACTIVE */}

        <TouchableOpacity
          style={[
            styles.tab,
            status === "INACTIVE" &&
              styles.activeTab,
          ]}
          onPress={() =>
            changeStatusTab(
              "INACTIVE"
            )
          }
          activeOpacity={0.8}
        >

          <Ionicons
            name="person-remove-outline"
            size={18}
            color={
              status === "INACTIVE"
                ? colors.primary
                : colors.textMuted
            }
          />

          <Text
            style={[
              styles.tabText,
              status === "INACTIVE" &&
                styles.activeTabText,
            ]}
          >
            Inactive
          </Text>

        </TouchableOpacity>

      </View>


      {/* ======================================================
          CONTENT
          ====================================================== */}

      {loading ? (

        <Loading />

      ) : error ? (

        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          message={error}
        />

      ) : players.length === 0 ? (

        <EmptyState
          icon={
            status === "ACTIVE"
              ? "people-outline"
              : "person-remove-outline"
          }

          title={
            status === "ACTIVE"
              ? "No active players"
              : "No inactive players"
          }

          message={
            search
              ? `No matches for "${search}"`
              : status === "ACTIVE"
              ? "No active players in the academy"
              : "There are no inactive players"
          }
        />

      ) : (

        <FlatList
          data={players}

          keyExtractor={(item) =>
            String(item.id)
          }

          contentContainerStyle={
            styles.listContent
          }

          showsVerticalScrollIndicator={
            false
          }

          renderItem={
            renderPlayer
          }
        />

      )}

    </ScreenContainer>
  );
}


/* ============================================================
   STYLES
   ============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
       SEARCH
       ======================================================== */

    searchWrap: {
      paddingHorizontal:
        spacing.lg,

      marginBottom:
        spacing.sm,
    },


    /* ========================================================
       TABS
       ======================================================== */

    tabsContainer: {
      flexDirection:
        "row",

      marginHorizontal:
        spacing.lg,

      marginBottom:
        spacing.md,

      backgroundColor:
        "#F3F4F6",

      borderRadius: 12,

      padding: 4,
    },


    tab: {
      flex: 1,

      minHeight: 44,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,

      borderRadius: 9,
    },


    activeTab: {
      backgroundColor:
        "#FFFFFF",
    },


    tabText: {
      fontSize: 14,

      fontWeight:
        "600",

      color:
        colors.textMuted,
    },


    activeTabText: {
      color:
        colors.primary,
    },


    /* ========================================================
       PLAYER LIST
       ======================================================== */

    listContent: {
      paddingHorizontal:
        spacing.lg,

      paddingBottom:
        spacing.xl,
    },


    playerWrapper: {
      marginBottom:
        spacing.md,
    },

  });