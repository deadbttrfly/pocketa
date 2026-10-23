"use client";

import { useState } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="flex min-h-screen">
          <Sidebar
            mobileOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <Header
              onMenuClick={() => setMobileMenuOpen(true)}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}