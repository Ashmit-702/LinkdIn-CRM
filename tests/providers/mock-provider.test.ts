import { describe, it, expect } from "vitest";
import { MockLinkedInProvider } from "@/providers/linkedin/mock-provider";

describe("MockLinkedInProvider", () => {
  const provider = new MockLinkedInProvider();

  it("returns a profile for a given target URL", async () => {
    const profile = await provider.getProfile({
      targetUrl: "https://www.linkedin.com/in/example",
      targetType: "profile",
    });
    expect(profile.sourceUrl).toBe("https://www.linkedin.com/in/example");
    expect(profile.fullName).toBeTruthy();
  });

  it("returns posts with the requested limit respected", async () => {
    const posts = await provider.getPosts({
      targetUrl: "https://www.linkedin.com/in/example",
      targetType: "profile",
      limit: 5,
    });
    expect(posts.length).toBe(5);
    for (const post of posts) {
      expect(post.externalId).toBeTruthy();
      expect(typeof post.impressions === "number" || post.impressions === null).toBe(true);
    }
  });

  it("filters posts by `since` when provided", async () => {
    const since = new Date();
    since.setDate(since.getDate() - 2);
    const posts = await provider.getPosts({
      targetUrl: "https://www.linkedin.com/in/example",
      targetType: "profile",
      since,
      limit: 20,
    });
    for (const post of posts) {
      expect(post.publishedAt!.getTime()).toBeGreaterThanOrEqual(since.getTime());
    }
  });

  it("never fabricates analytics aggregates", async () => {
    const analytics = await provider.getAnalytics({
      targetUrl: "https://www.linkedin.com/in/example",
      targetType: "profile",
    });
    expect(analytics.totalPosts).toBeNull();
  });
});
