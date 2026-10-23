import { apiFetch } from "./api";

export type Budget = {
  id: number;
  category_id: number;
  category_name: string;
  amount: number | string;
  budget?: number | string;
  spent?: number | string;
  remaining?: number | string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export interface BudgetsResponse {
  success: boolean;
  message?: string;
  data: Budget[];
}

export interface BudgetResponse {
  success: boolean;
  message: string;
  data: Budget;
}

export interface DeleteBudgetResponse {
  success: boolean;
  message: string;
}

export interface CreateBudgetPayload {
  category_id: number;
  amount: number;
  start_date: string;
  end_date: string;
}

export interface UpdateBudgetPayload {
  category_id: number;
  amount: number;
  start_date: string;
  end_date: string;
}

export async function getBudgets(
  token: string,
): Promise<BudgetsResponse> {
  return apiFetch<BudgetsResponse>("/budgets", {
    method: "GET",
    token,
  });
}

export async function getBudget(
  token: string,
  budgetId: number,
): Promise<BudgetResponse> {
  return apiFetch<BudgetResponse>(`/budgets/${budgetId}`, {
    method: "GET",
    token,
  });
}

export async function createBudget(
  token: string,
  payload: CreateBudgetPayload,
): Promise<BudgetResponse> {
  return apiFetch<BudgetResponse>("/budgets", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateBudget(
  token: string,
  budgetId: number,
  payload: UpdateBudgetPayload,
): Promise<BudgetResponse> {
  return apiFetch<BudgetResponse>(`/budgets/${budgetId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteBudget(
  token: string,
  budgetId: number,
): Promise<DeleteBudgetResponse> {
  return apiFetch<DeleteBudgetResponse>(`/budgets/${budgetId}`, {
    method: "DELETE",
    token,
  });
}