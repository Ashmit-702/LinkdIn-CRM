"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatNumber, formatPercent } from "@/lib/utils";

interface Summary {
  totalPosts: number;
  totalImpressions: number;
  totalReactions: number;
  totalComments: number;
  totalReposts: number;
  averageEngagementRate: number | null;
  topPosts: { id: string; content: string | null; engagementRate: number | null; postUrl: string | null }[];
}

export function AnalyticsClient() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<{ week: string; impressions: number; reactions: number }[]>([]);

  useEffect(() => {
    fetch("/api/linkedin/analytics")
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary);
        setTrend(d.trend ?? []);
      });
  }, []);

  if (!summary) return <div className="p-6 text-sm text-muted-foreground">Loading analytics…</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Total posts" value={String(summary.totalPosts)} />
        <KpiCard label="Impressions" value={formatNumber(summary.totalImpressions)} accent />
        <KpiCard label="Reactions" value={formatNumber(summary.totalReactions)} accent />
        <KpiCard label="Comments" value={formatNumber(summary.totalComments)} accent />
        <KpiCard
          label="Avg. engagement"
          value={formatPercent(summary.averageEngagementRate)}
          sublabel="Calculated by Northline"
          accent
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Engagement over time</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="impressions" stroke="hsl(var(--accent))" name="Impressions (provider)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="reactions" stroke="hsl(var(--primary))" name="Reactions (provider)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top-performing posts</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {summary.topPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sync LinkedIn data to see your top posts here.</p>
          ) : (
            summary.topPosts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <a href={p.postUrl ?? "#"} target="_blank" rel="noreferrer" className="max-w-md truncate text-sm hover:underline">
                  {p.content ?? "(no text captured)"}
                </a>
                <span className="text-sm font-medium">{formatPercent(p.engagementRate)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
