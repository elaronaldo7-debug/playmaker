import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import PlayerCard, { PlayerListItem } from "@/components/PlayerCard";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";
import { useAuth } from "@/context/AuthContext";
import { canEditPlayers } from "@/utils/permissions";
import api, { apiErrorMessage } from "@/services/api";
import { colors, spacing } from "@/constants/theme";

export default function PlayersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlayers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const { data } = await api.get("/players", {
        params: { search: query || undefined, per_page: 100 },
      });
      setPlayers(data.players);
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load players"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayers("");
  }, [loadPlayers]);

  return (
    <ScreenContainer scroll={false}>
      <Header
        title="Players"
        subtitle={`${players.length} shown`}
        rightIcon={canEditPlayers(user) ? "add" : undefined}
        onRightPress={() => router.push("/players/new" as any)}
      />

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onDebouncedChange={loadPlayers}
          placeholder="Search by name or player ID"
        />
      </View>

      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title="Something went wrong" message={error} />
      ) : players.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No players found"
          message={search ? `No matches for "${search}"` : "No players in the academy yet"}
        />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PlayerCard player={item} onPress={() => router.push(`/players/${item.id}` as any)} />
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
