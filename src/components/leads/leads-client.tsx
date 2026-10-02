"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;

interface Lead {
  id: string;
  title: string;
  status: string;
  value: string | null;
  contact: { name: string; company: string | null };
}

export function LeadsClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .catch(() => toast.error("Couldn't load leads."))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) toast.error("Could not update lead status.");
  }

  return (
    <div className="p-6">
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={4}>Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={4}>No leads yet.</td></tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{l.title}</td>
                  <td className="px-4 py-3">{l.contact.name} <span className="text-muted-foreground">· {l.contact.company}</span></td>
                  <td className="px-4 py-3">{l.value ? `$${Number(l.value).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="ml-2"><StatusBadge status={l.status} /></span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
