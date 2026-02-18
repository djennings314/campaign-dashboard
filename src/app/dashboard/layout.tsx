"use client";

import { Sidebar } from "@/components/sidebar";
import { DashboardProvider } from "@/lib/dashboard-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </DashboardProvider>
  );
}
