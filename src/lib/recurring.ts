import { apiFetch } from "./api";

export type RecurringType = "income" | "expense";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringTransaction {
  id: number;
  account_id: number;
  category_id: number;
  type: RecurringType;
  amount: number | string;
  description: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  is_active: boolean | number;
}

export interface RecurringPayload {
  account_id: number;
  category_id: number;
  type: RecurringType;
  amount: number;
  description?: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
}

export interface RecurringListResponse {
  success: boolean;
  message?: string;
  data: RecurringTransaction[];
}

export interface RecurringItemResponse {
  success: boolean;
  message?: string;
  data: RecurringTransaction;
}

export interface ProcessRecurringResponse {
  success: boolean;
  message: string;
  data: {
    processed: number;
    transactions_created: number;
    transactions: unknown[];
  };
}

export interface RecurringActionResponse {
  success: boolean;
  message: string;
}

export async function getRecurringTransactions(
  token: string,
): Promise<RecurringListResponse> {
  return apiFetch<RecurringListResponse>("/recurring-transactions", {
    method: "GET",
    token,
  });
}

export async function getRecurringTransaction(
  token: string,
  id: number,
): Promise<RecurringItemResponse> {
  return apiFetch<RecurringItemResponse>(`/recurring-transactions/${id}`, {
    method: "GET",
    token,
  });
}

export async function createRecurringTransaction(
  token: string,
  payload: RecurringPayload,
): Promise<RecurringItemResponse> {
  return apiFetch<RecurringItemResponse>("/recurring-transactions", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateRecurringTransaction(
  token: string,
  id: number,
  payload: RecurringPayload,
): Promise<RecurringItemResponse> {
  return apiFetch<RecurringItemResponse>(`/recurring-transactions/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteRecurringTransaction(
  token: string,
  id: number,
): Promise<RecurringActionResponse> {
  return apiFetch<RecurringActionResponse>(`/recurring-transactions/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function updateRecurringStatus(
  token: string,
  id: number,
  is_active: boolean,
): Promise<RecurringItemResponse> {
  return apiFetch<RecurringItemResponse>(
    `/recurring-transactions/${id}/status`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ is_active }),
    },
  );
}

export async function processRecurringTransactions(
  token: string,
): Promise<ProcessRecurringResponse> {
  return apiFetch<ProcessRecurringResponse>("/recurring-transactions/process", {
    method: "POST",
    token,
  });
}
