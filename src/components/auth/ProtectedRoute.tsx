
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  clearAuth,
  getToken,
  isTokenExpired,
  subscribeToAuth,
} from "@/lib/auth-storage";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function getAuthSnapshot() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return getToken();
}

function getServerAuthSnapshot() {
  return undefined;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const router = useRouter();

  const token = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );

  const expired =
    typeof token === "string" && isTokenExpired(token);

  useEffect(() => {
    if (expired) {
      clearAuth();
      router.replace("/login?reason=session-expired");
      return;
    }

    if (token === null) {
      router.replace("/login");
    }
  }, [expired, token, router]);

  if (
    token === undefined ||
    token === null ||
    expired
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">
          Checking authentication...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
