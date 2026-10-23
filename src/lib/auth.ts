import { apiFetch } from "./api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthData {
  token: string;
  user: AuthUser;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: AuthData;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export async function login(
  payload: LoginPayload,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}