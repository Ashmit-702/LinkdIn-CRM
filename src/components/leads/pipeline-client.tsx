"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface Lead {
  id: string;
  title: string;
  status: string;
  contact: { name: string };
}

const COLUMNS = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;

export function PipelineClient() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch("/api/leads").then((r) => r.json()).then((d) => setLeads(d.leads ?? []));
  }, []);

  return (
    <div className="flex gap-4 overflow-x-auto p-6">
      {COLUMNS.map((status) => {
        const columnLeads = leads.filter((l) => l.status === status);
        return (
          <div key={status} className="w-64 flex-shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{status.charAt(0) + status.slice(1).toLowerCase()}</h3>
              <span className="text-xs text-muted-foreground">{columnLeads.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {columnLeads.map((l) => (
                <Card key={l.id} className="p-3">
                  <p className="text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.contact.name}</p>
                </Card>
              ))}
              {columnLeads.length === 0 && (
                <p className="text-xs text-muted-foreground">No deals here yet.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
