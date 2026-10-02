import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    linkedinPost: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getLinkedInSummary } from "@/services/analytics-service";

describe("analytics-service.getLinkedInSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sums provider-supplied metrics and ignores nulls", async () => {
    (prisma.linkedinPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { impressions: 100, reactions: 10, comments: 2, reposts: 1, engagementRate: 13 },
      { impressions: null, reactions: 5, comments: null, reposts: 0, engagementRate: null },
    ]);

    const summary = await getLinkedInSummary("user-1");
    expect(summary.totalPosts).toBe(2);
    expect(summary.totalImpressions).toBe(100);
    expect(summary.totalReactions).toBe(15);
    expect(summary.totalComments).toBe(2);
    expect(summary.averageEngagementRate).toBe(13);
  });

  it("returns null average engagement when no post has one", async () => {
    (prisma.linkedinPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { impressions: null, reactions: null, comments: null, reposts: null, engagementRate: null },
    ]);
    const summary = await getLinkedInSummary("user-1");
    expect(summary.averageEngagementRate).toBeNull();
  });
});
