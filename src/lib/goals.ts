import { apiFetch } from "./api";

export type GoalStatus = "active" | "completed" | "cancelled";

export interface Goal {
  id: number;
  name: string;
  description: string | null;
  target_amount: number | string;
  current_amount?: number | string;
  total_contributions?: number | string;
  remaining_amount?: number | string;
  progress_percentage?: number | string;
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at?: string;
}

export interface GoalContribution {
  id: number;
  goal_id: number;
  amount: number | string;
  contribution_date: string;
  note: string | null;
  created_at?: string;
}

export interface GoalsResponse {
  success: boolean;
  message?: string;
  data: Goal[];
}

export interface GoalResponse {
  success: boolean;
  message?: string;
  data: Goal;
}

export interface ContributionsResponse {
  success: boolean;
  message?: string;
  data: GoalContribution[];
}

export interface ContributionResponse {
  success: boolean;
  message?: string;
  data: GoalContribution;
}

export interface DeleteGoalResponse {
  success: boolean;
  message: string;
}

export interface CreateGoalPayload {
  name: string;
  description?: string | null;
  target_amount: number;
  target_date?: string | null;
  status?: GoalStatus;
}

export type UpdateGoalPayload = CreateGoalPayload;

export interface CreateContributionPayload {
  amount: number;
  contribution_date: string;
  note?: string | null;
}

export async function getGoals(token: string) {
  return apiFetch<GoalsResponse>("/goals", {
    method: "GET",
    token,
  });
}

export async function getGoal(token: string, goalId: number) {
  return apiFetch<GoalResponse>(`/goals/${goalId}`, {
    method: "GET",
    token,
  });
}

export async function createGoal(token: string, payload: CreateGoalPayload) {
  return apiFetch<GoalResponse>("/goals", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateGoal(
  token: string,
  goalId: number,
  payload: UpdateGoalPayload,
) {
  return apiFetch<GoalResponse>(`/goals/${goalId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteGoal(token: string, goalId: number) {
  return apiFetch<DeleteGoalResponse>(`/goals/${goalId}`, {
    method: "DELETE",
    token,
  });
}

export async function getContributions(token: string, goalId: number) {
  return apiFetch<ContributionsResponse>(`/goals/${goalId}/contributions`, {
    method: "GET",
    token,
  });
}

export async function createContribution(
  token: string,
  goalId: number,
  payload: CreateContributionPayload,
) {
  return apiFetch<ContributionResponse>(`/goals/${goalId}/contributions`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteContribution(
  token: string,
  goalId: number,
  contributionId: number,
) {
  return apiFetch<DeleteGoalResponse>(
    `/goals/${goalId}/contributions/${contributionId}`,
    {
      method: "DELETE",
      token,
    },
  );
}
