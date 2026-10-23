import { apiFetch } from "./api";

export type AccountType =
  | "cash"
  | "bank"
  | "ewallet"
  | "other";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountsResponse {
  success: boolean;
  message?: string;
  data: Account[];
}

export interface AccountResponse {
  success: boolean;
  message: string;
  data: Account;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

export interface CreateAccountPayload {
  name: string;
  type: AccountType;
  balance: number;
}

export interface UpdateAccountPayload {
  name: string;
  type: AccountType;
}

export async function getAccounts(
  token: string,
): Promise<AccountsResponse> {
  return apiFetch<AccountsResponse>("/accounts", {
    method: "GET",
    token,
  });
}

export async function createAccount(
  token: string,
  payload: CreateAccountPayload,
): Promise<AccountResponse> {
  return apiFetch<AccountResponse>("/accounts", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateAccount(
  token: string,
  accountId: number,
  payload: UpdateAccountPayload,
): Promise<AccountResponse> {
  return apiFetch<AccountResponse>(`/accounts/${accountId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(
  token: string,
  accountId: number,
): Promise<DeleteAccountResponse> {
  return apiFetch<DeleteAccountResponse>(
    `/accounts/${accountId}`,
    {
      method: "DELETE",
      token,
    },
  );
}