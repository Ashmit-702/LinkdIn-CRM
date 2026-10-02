import { Topbar } from "@/components/layout/topbar";
import { AnalyticsClient } from "@/components/linkedin/analytics-client";

export default function AnalyticsPage() {
  return (
    <div>
      <Topbar title="Analytics" />
      <AnalyticsClient />
    </div>
  );
}
