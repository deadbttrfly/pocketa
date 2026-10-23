import { apiFetch } from "./api";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  account_id: number;
  account_name: string;
  category_id: number;
  category_name: string;
  type: TransactionType;
  amount: number | string;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionsResponse {
  success: boolean;
  message?: string;
  data: Transaction[];
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  data: Transaction;
}

export interface DeleteTransactionResponse {
  success: boolean;
  message: string;
}

export interface CreateTransactionPayload {
  account_id: number;
  category_id: number;
  type: TransactionType;
  amount: number;
  description?: string;
  transaction_date: string;
}

export interface UpdateTransactionPayload {
  account_id: number;
  category_id: number;
  type: TransactionType;
  amount: number;
  description?: string;
  transaction_date: string;
}

export async function getTransactions(
  token: string,
): Promise<TransactionsResponse> {
  return apiFetch<TransactionsResponse>("/transactions", {
    method: "GET",
    token,
  });
}

export async function getTransaction(
  token: string,
  transactionId: number,
): Promise<TransactionResponse> {
  return apiFetch<TransactionResponse>(`/transactions/${transactionId}`, {
    method: "GET",
    token,
  });
}

export async function createTransaction(
  token: string,
  payload: CreateTransactionPayload,
): Promise<TransactionResponse> {
  return apiFetch<TransactionResponse>("/transactions", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateTransaction(
  token: string,
  transactionId: number,
  payload: UpdateTransactionPayload,
): Promise<TransactionResponse> {
  return apiFetch<TransactionResponse>(`/transactions/${transactionId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteTransaction(
  token: string,
  transactionId: number,
): Promise<DeleteTransactionResponse> {
  return apiFetch<DeleteTransactionResponse>(`/transactions/${transactionId}`, {
    method: "DELETE",
    token,
  });
}
