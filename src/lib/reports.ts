import { apiFetch } from "@/lib/api";

export interface ReportSummary {
  total_income: number;
  total_expense: number;
  net_cash_flow: number;
  transaction_count: number;
  start_date: string;
  end_date: string;
}

export interface IncomeExpenseReport {
  income: number;
  expense: number;
  net: number;
  start_date: string;
  end_date: string;
}

export interface ExpenseCategory {
  category_id: number;
  category_name: string;
  amount: number;
}

export interface ExpenseCategoryReport {
  start_date: string;
  end_date: string;
  categories: ExpenseCategory[];
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
}

export interface MonthlyTrendReport {
  start_date: string;
  end_date: string;
  months: MonthlyTrend[];
}

export interface BudgetPerformance {
  budget_id: number;
  category_id: number;
  category_name: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
}

export interface BudgetPerformanceReport {
  start_date: string;
  end_date: string;
  budgets: BudgetPerformance[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

function getQuery(startDate: string, endDate: string) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  return `?${params.toString()}`;
}

export function getReportSummary(
  token: string,
  startDate: string,
  endDate: string,
) {
  return apiFetch<ApiResponse<ReportSummary>>(
    `/reports/summary${getQuery(startDate, endDate)}`,
    { token },
  );
}

export function getIncomeExpenseReport(
  token: string,
  startDate: string,
  endDate: string,
) {
  return apiFetch<ApiResponse<IncomeExpenseReport>>(
    `/reports/income-expense${getQuery(startDate, endDate)}`,
    { token },
  );
}

export function getExpenseCategoryReport(
  token: string,
  startDate: string,
  endDate: string,
) {
  return apiFetch<ApiResponse<ExpenseCategoryReport>>(
    `/reports/expenses-by-category${getQuery(startDate, endDate)}`,
    { token },
  );
}

export function getMonthlyTrendReport(
  token: string,
  startDate: string,
  endDate: string,
) {
  return apiFetch<ApiResponse<MonthlyTrendReport>>(
    `/reports/monthly-trend${getQuery(startDate, endDate)}`,
    { token },
  );
}

export function getBudgetPerformanceReport(
  token: string,
  startDate: string,
  endDate: string,
) {
  return apiFetch<ApiResponse<BudgetPerformanceReport>>(
    `/reports/budget-performance${getQuery(startDate, endDate)}`,
    { token },
  );
}
