import api from "@/services/api";
import { Fee, FeePayment, FeeStatus, PaymentMethod } from "@/types";

export interface FeeListParams {
  category_id?: number; // required for coaches
  month?: string; // YYYY-MM
  status?: FeeStatus;
}

/** GET /api/fees -- coaches are restricted server-side to their assigned category. */
export async function listFees(params: FeeListParams): Promise<Fee[]> {
  const { data } = await api.get<Fee[]>("/fees", { params });
  return data;
}

export async function getFee(feeId: number): Promise<Fee> {
  const { data } = await api.get<Fee>(`/fees/${feeId}`);
  return data;
}

/** POST /api/fees -- creates (or fetches, if it already exists) the monthly fee for a player. */
export async function createOrGetFee(input: {
  player_id: number;
  month: string;
  fee_amount: number;
}): Promise<Fee> {
  const { data } = await api.post<Fee>("/fees", input);
  return data;
}

export async function updateFeeAmount(feeId: number, feeAmount: number): Promise<Fee> {
  const { data } = await api.put<Fee>(`/fees/${feeId}`, { fee_amount: feeAmount });
  return data;
}

export async function deleteFee(feeId: number): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/fees/${feeId}`);
  return data;
}

export async function listPayments(feeId: number): Promise<FeePayment[]> {
  const { data } = await api.get<FeePayment[]>(`/fees/${feeId}/payments`);
  return data;
}

/** Records a new payment; supports multiple partial payments per monthly fee. */
export async function addPayment(
  feeId: number,
  amount: number,
  paymentMethod: PaymentMethod
): Promise<Fee> {
  const { data } = await api.post<Fee>(`/fees/${feeId}/payments`, {
    amount,
    payment_method: paymentMethod,
  });
  return data;
}

export async function updatePayment(
  paymentId: number,
  input: { amount?: number; payment_method?: PaymentMethod }
): Promise<Fee> {
  const { data } = await api.put<Fee>(`/payments/${paymentId}`, input);
  return data;
}

export async function deletePayment(paymentId: number): Promise<Fee> {
  const { data } = await api.delete<Fee>(`/payments/${paymentId}`);
  return data;
}
