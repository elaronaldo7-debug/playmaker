import api from "@/services/api";
import { Player, PlayersListResponse } from "@/types";

export interface PlayerListParams {
  search?: string;
  category_id?: number;
  status?: "ACTIVE" | "INACTIVE";
  page?: number;
  per_page?: number;
}

export interface PlayerInput {
  player_id: string;
  player_name: string;
  date_of_birth: string; // YYYY-MM-DD
  category_id: number;
  profile_photo?: string;
  school?: string;
  standard?: string;
  phone_1?: string;
  phone_2?: string;
  pickup_person?: string;
  health_condition?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export async function listPlayers(params: PlayerListParams = {}): Promise<PlayersListResponse> {
  const { data } = await api.get<PlayersListResponse>("/players", { params });
  return data;
}

export async function getPlayer(playerId: number): Promise<Player> {
  const { data } = await api.get<Player>(`/players/${playerId}`);
  return data;
}

export async function createPlayer(input: PlayerInput): Promise<Player> {
  const { data } = await api.post<Player>("/players", input);
  return data;
}

export async function updatePlayer(playerId: number, input: Partial<PlayerInput>): Promise<Player> {
  const { data } = await api.put<Player>(`/players/${playerId}`, input);
  return data;
}

export async function deletePlayer(playerId: number): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/players/${playerId}`);
  return data;
}
