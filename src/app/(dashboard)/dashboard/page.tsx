import { Topbar } from "@/components/layout/topbar";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <div>
      <Topbar title="Dashboard" />
      <DashboardClient />
    </div>
  );
}
