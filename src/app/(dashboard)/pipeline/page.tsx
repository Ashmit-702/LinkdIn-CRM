import { Topbar } from "@/components/layout/topbar";
import { PipelineClient } from "@/components/leads/pipeline-client";

export default function PipelinePage() {
  return (
    <div>
      <Topbar title="Pipeline" />
      <PipelineClient />
    </div>
  );
}
