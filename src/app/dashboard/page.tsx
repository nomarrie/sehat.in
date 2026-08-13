import type { Metadata } from "next";
import { AppShell } from "@/components/navigation/app-shell";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import { loadDashboardData } from "@/lib/sehatin/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const dashboardData = await loadDashboardData();
  return (
    <AppShell activePath="/dashboard">
      <DashboardOverview data={dashboardData} />
    </AppShell>
  );
}
