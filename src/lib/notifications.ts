import { apiFetch } from "./api";

export type NotificationType =
  | "budget_alert"
  | "recurring_due"
  | "recurring_success"
  | "recurring_failure";

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean | number;
  created_at: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: AppNotification[];
    unread_count: number;
  };
}

export interface NotificationActionResponse {
  success: boolean;
  message?: string;
  data?: {
    updated_count?: number;
  };
}

export async function syncNotifications(
  token: string,
): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>("/notifications/sync", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export async function getNotifications(
  token: string,
): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>("/notifications", {
    method: "GET",
    token,
  });
}

export async function markNotificationRead(
  token: string,
  id: number,
): Promise<NotificationActionResponse> {
  return apiFetch<NotificationActionResponse>(`/notifications/${id}/read`, {
    method: "PATCH",
    token,
    body: JSON.stringify({}),
  });
}

export async function markAllNotificationsRead(
  token: string,
): Promise<NotificationActionResponse> {
  return apiFetch<NotificationActionResponse>("/notifications/read-all", {
    method: "PATCH",
    token,
    body: JSON.stringify({}),
  });
}

export async function deleteNotification(
  token: string,
  id: number,
): Promise<NotificationActionResponse> {
  return apiFetch<NotificationActionResponse>(`/notifications/${id}`, {
    method: "DELETE",
    token,
  });
}
