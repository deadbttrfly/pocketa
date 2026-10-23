const TOKEN_KEY = "pocketa_token";
const USER_KEY = "pocketa_user";
const AUTH_CHANGE_EVENT = "pocketa-auth-change";

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(
      atob(
        parts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          .padEnd(Math.ceil(parts[1].length / 4) * 4, "="),
      ),
    ) as { exp?: unknown };

    if (typeof payload.exp !== "number") {
      return true;
    }

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function saveAuth(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token;
}

export function getUser<T>(): T | null {
  const user = localStorage.getItem(USER_KEY);

  if (!user || user === "undefined" || user === "null") {
    return null;
  }

  try {
    return JSON.parse(user) as T;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange();
}

export function subscribeToAuth(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
