import { Topbar } from "@/components/layout/topbar";
import { LinkedInClient } from "@/components/linkedin/linkedin-client";

export default function LinkedInPage() {
  return (
    <div>
      <Topbar title="LinkedIn integration" />
      <LinkedInClient />
    </div>
  );
}
