import { prisma } from "@/lib/prisma";

/**
 * All aggregate LinkedIn analytics are CALCULATED BY OUR SYSTEM from the
 * normalized `LinkedinPost` rows — never returned directly by a
 * provider. Each function here documents which raw fields it reads
 * (provider-supplied) versus what it derives (calculated).
 */

export async function getLinkedInSummary(userId: string) {
  const posts = await prisma.linkedinPost.findMany({
    where: { userId },
    orderBy: { publishedAt: "desc" },
  });

  type PostRow = (typeof posts)[number];

  const totalPosts = posts.length; // calculated
  const sum = (field: "impressions" | "reactions" | "comments" | "reposts") =>
    posts.reduce((acc: number, p: PostRow) => acc + (p[field] ?? 0), 0); // calculated, ignoring nulls

  const totalImpressions = sum("impressions");
  const totalReactions = sum("reactions");
  const totalComments = sum("comments");
  const totalReposts = sum("reposts");

  const postsWithEngagementRate = posts.filter((p: PostRow) => p.engagementRate !== null);
  const averageEngagementRate =
    postsWithEngagementRate.length > 0
      ? Number(
          (
            postsWithEngagementRate.reduce((acc: number, p: PostRow) => acc + (p.engagementRate ?? 0), 0) /
            postsWithEngagementRate.length
          ).toFixed(2)
        )
      : null;

  const topPosts = [...posts]
    .filter((p: PostRow) => p.engagementRate !== null)
    .sort((a: PostRow, b: PostRow) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))
    .slice(0, 5);

  return {
    totalPosts,
    totalImpressions,
    totalReactions,
    totalComments,
    totalReposts,
    averageEngagementRate,
    topPosts,
  };
}

/** Buckets posts by ISO week for a simple "performance over time" chart. */
export async function getEngagementTrend(userId: string) {
  const posts = await prisma.linkedinPost.findMany({
    where: { userId, publishedAt: { not: null } },
    orderBy: { publishedAt: "asc" },
  });

  const buckets = new Map<
    string,
    { impressions: number; reactions: number; comments: number; reposts: number; count: number }
  >();

  for (const post of posts) {
    const weekKey = isoWeekKey(post.publishedAt!);
    const bucket = buckets.get(weekKey) ?? {
      impressions: 0,
      reactions: 0,
      comments: 0,
      reposts: 0,
      count: 0,
    };
    bucket.impressions += post.impressions ?? 0;
    bucket.reactions += post.reactions ?? 0;
    bucket.comments += post.comments ?? 0;
    bucket.reposts += post.reposts ?? 0;
    bucket.count += 1;
    buckets.set(weekKey, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, data]) => ({ week, ...data }));
}

export async function listPosts(userId: string, opts: { limit?: number } = {}) {
  return prisma.linkedinPost.findMany({
    where: { userId },
    orderBy: { publishedAt: "desc" },
    take: opts.limit ?? 100,
  });
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
