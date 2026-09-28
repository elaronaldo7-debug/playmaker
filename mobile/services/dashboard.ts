import api from "@/services/api";
import { Dashboard } from "@/types";

/** GET /api/dashboard -- backend returns a role-specific shape (admin sees fee totals, coach never does). */
export async function getDashboard(): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>("/dashboard");
  return data;
}
