"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { KpiCard } from "./kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/utils";

interface DashboardData {
  kpis: {
    totalContacts: number;
    totalLeads: number;
    qualifiedLeads: number;
    totalPosts: number;
    totalImpressions: number;
    totalReactions: number;
    totalComments: number;
    averageEngagementRate: number | null;
  };
  pipeline: { status: string; count: number }[];
  conversionRate: number | null;
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError("Couldn't load dashboard data."));
  }, []);

  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Loading dashboard…</div>;

  const { kpis, pipeline, conversionRate } = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total leads" value={String(kpis.totalLeads)} />
        <KpiCard label="Qualified leads" value={String(kpis.qualifiedLeads)} />
        <KpiCard label="Total contacts" value={String(kpis.totalContacts)} />
        <KpiCard label="LinkedIn posts" value={String(kpis.totalPosts)} />
        <KpiCard label="Total impressions" value={formatNumber(kpis.totalImpressions)} accent />
        <KpiCard label="Total reactions" value={formatNumber(kpis.totalReactions)} accent />
        <KpiCard label="Total comments" value={formatNumber(kpis.totalComments)} accent />
        <KpiCard
          label="Avg. engagement"
          value={formatPercent(kpis.averageEngagementRate)}
          sublabel="Calculated by Northline"
          accent
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead conversion rate</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[240px] flex-col items-center justify-center">
            <p className="font-display text-5xl font-semibold">{formatPercent(conversionRate)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Won ÷ total leads — calculated</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
