import api from "@/services/api";
import { Category } from "@/types";

export async function listCategories(activeOnly = false): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories", {
    params: activeOnly ? { active_only: true } : undefined,
  });
  return data;
}

export async function getCategory(categoryId: number): Promise<Category> {
  const { data } = await api.get<Category>(`/categories/${categoryId}`);
  return data;
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await api.post<Category>("/categories", { name });
  return data;
}

export async function updateCategory(
  categoryId: number,
  input: { name?: string; is_active?: boolean }
): Promise<Category> {
  const { data } = await api.put<Category>(`/categories/${categoryId}`, input);
  return data;
}

export async function deleteCategory(categoryId: number): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/categories/${categoryId}`);
  return data;
}
