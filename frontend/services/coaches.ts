import api from "@/services/api";
import { Coach } from "@/types";

export interface CreateCoachInput {
  username: string;
  password: string;
  coach_name: string;
  category_id?: number;
}

export interface UpdateCoachInput {
  coach_name?: string;
  category_id?: number;
  is_active?: boolean;
  password?: string;
}

export async function listCoaches(): Promise<Coach[]> {
  const { data } = await api.get<Coach[]>("/coaches");
  return data;
}

export async function getCoach(coachId: number): Promise<Coach> {
  const { data } = await api.get<Coach>(`/coaches/${coachId}`);
  return data;
}

export async function createCoach(input: CreateCoachInput): Promise<Coach> {
  const { data } = await api.post<Coach>("/coaches", input);
  return data;
}

export async function updateCoach(coachId: number, input: UpdateCoachInput): Promise<Coach> {
  const { data } = await api.put<Coach>(`/coaches/${coachId}`, input);
  return data;
}

export async function deleteCoach(coachId: number): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/coaches/${coachId}`);
  return data;
}
