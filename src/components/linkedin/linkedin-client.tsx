"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/utils";

interface Integration {
  id: string;
  targetUrl: string;
  label: string | null;
  provider: string;
  lastSyncedAt: string | null;
}

interface Post {
  id: string;
  postUrl: string | null;
  content: string | null;
  publishedAt: string | null;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  engagementRate: number | null;
}

export function LinkedInClient() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function loadAll() {
    const [intRes, postRes] = await Promise.all([
      fetch("/api/integrations").then((r) => r.json()),
      fetch("/api/linkedin/posts").then((r) => r.json()),
    ]);
    setIntegrations(intRes.integrations ?? []);
    setPosts(postRes.posts ?? []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: newUrl, targetType: "profile" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not connect target.");
      }
      toast.success("LinkedIn target connected.");
      setNewUrl("");
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleSync(integrationId: string) {
    setSyncingId(integrationId);
    try {
      const res = await fetch("/api/linkedin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed.");
      toast.success(`Sync complete — ${data.recordsProcessed} posts processed.`);
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected LinkedIn targets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleConnect} className="flex gap-2">
            <Input
              placeholder="https://www.linkedin.com/in/your-profile"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
            />
            <Button type="submit">Connect</Button>
          </form>

          {integrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No LinkedIn target connected yet. Add your profile or company page URL above — data
              is retrieved through the configured provider ({" "}
              <code>mock</code> by default, or Apify once configured).
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {integrations.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{i.label ?? i.targetUrl}</p>
                    <p className="text-xs text-muted-foreground">
                      Provider: {i.provider.toLowerCase()} · Last synced:{" "}
                      {i.lastSyncedAt ? new Date(i.lastSyncedAt).toLocaleString() : "never"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={syncingId === i.id}
                    onClick={() => handleSync(i.id)}
                  >
                    {syncingId === i.id ? "Syncing…" : "Sync LinkedIn data"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Posts</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Post</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Impressions</th>
              <th className="px-4 py-3">Reactions</th>
              <th className="px-4 py-3">Comments</th>
              <th className="px-4 py-3">Reposts</th>
              <th className="px-4 py-3">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={7}>No posts synced yet.</td></tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="max-w-xs truncate px-4 py-3">
                    <a href={p.postUrl ?? "#"} target="_blank" rel="noreferrer" className="hover:underline">
                      {p.content ?? "(no text captured)"}
                    </a>
                  </td>
                  <td className="px-4 py-3">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">{formatNumber(p.impressions)}</td>
                  <td className="px-4 py-3">{formatNumber(p.reactions)}</td>
                  <td className="px-4 py-3">{formatNumber(p.comments)}</td>
                  <td className="px-4 py-3">{formatNumber(p.reposts)}</td>
                  <td className="px-4 py-3">{formatPercent(p.engagementRate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
