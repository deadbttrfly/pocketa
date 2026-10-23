
import { clearAuth } from "@/lib/auth-storage";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ApiOptions extends RequestInit {
  token?: string;
}

interface ApiErrorPayload {
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let redirectingToLogin = false;

function handleUnauthorized(endpoint: string) {
  if (typeof window === "undefined") return;

  // Login/register errors must remain visible on their own forms.
  if (/^\/auth\/(login|register)(?:\/|$)/.test(endpoint)) {
    return;
  }

  clearAuth();

  // Avoid repeatedly navigating when multiple API calls return 401.
  if (
    !redirectingToLogin &&
    window.location.pathname !== "/login"
  ) {
    redirectingToLogin = true;
    window.location.replace("/login?reason=session-expired");
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const authenticatedRequest = Boolean(
    headers.get("Authorization"),
  );

  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    // Network errors must not destroy a potentially valid session.
    throw error;
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    // The server may return an empty or non-JSON response.
  }

  if (!response.ok) {
    let message = "Something went wrong";

    if (
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as ApiErrorPayload).message === "string"
    ) {
      message = (payload as ApiErrorPayload).message!;
    }

    if (response.status === 401 && authenticatedRequest) {
      handleUnauthorized(endpoint);
    }

    throw new ApiError(message, response.status);
  }

  return payload as T;
}
