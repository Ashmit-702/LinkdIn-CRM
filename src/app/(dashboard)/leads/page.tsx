import { Topbar } from "@/components/layout/topbar";
import { LeadsClient } from "@/components/leads/leads-client";

export default function LeadsPage() {
  return (
    <div>
      <Topbar title="Leads" />
      <LeadsClient />
    </div>
  );
}
