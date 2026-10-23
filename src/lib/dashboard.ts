import { apiFetch } from "./api";

export interface DashboardBudget {
  id: number;
  category_id: number;
  category_name: string;
  budget: number | string;
  spent: number | string;
  remaining: number | string;
}

export interface DashboardTransaction {
  id: number;
  category_id: number;
  category_name: string;
  type: "income" | "expense";
  amount: number | string;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

export interface DashboardExpenseCategory {
  category_id: number;
  category_name: string;
  amount: number | string;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    summary: {
      balance: string;
      income: string;
      expense: string;
    };
    expense_by_category: DashboardExpenseCategory[];
    budgets: DashboardBudget[];
    recent_transactions: DashboardTransaction[];
  };
}

export async function getDashboard(
  token: string,
): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>("/dashboard", {
    method: "GET",
    token,
  });
}