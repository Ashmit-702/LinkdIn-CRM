import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApifyLinkedInProvider } from "@/providers/linkedin/apify-provider";
import { ProviderError } from "@/providers/linkedin/types";

function mockFetchOnce(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("ApifyLinkedInProvider — normalization", () => {
  const provider = new ApifyLinkedInProvider({
    apiToken: "test-token",
    postsActorId: "some-actor",
    runTimeoutSecs: 5,
    maxItemsPerSync: 10,
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes a variety of field-name conventions into the internal schema", async () => {
    mockFetchOnce([
      {
        id: "urn:li:activity:1",
        text: "Hello world",
        url: "https://www.linkedin.com/feed/update/1",
        publishedAt: "2026-01-01T00:00:00.000Z",
        impressions: 1000,
        likes: 50,
        numComments: 4,
        shares: 2,
      },
      {
        // Different key naming convention from a different actor
        postId: "2",
        postText: "Second post",
        postUrl: "https://www.linkedin.com/feed/update/2",
        date: "2026-01-05T00:00:00.000Z",
        viewCount: 500,
        reactionCount: 10,
        commentCount: 1,
      },
    ]);

    const posts = await provider.getPosts({
      targetUrl: "https://www.linkedin.com/in/example",
      targetType: "profile",
    });

    expect(posts).toHaveLength(2);
    expect(posts[0].externalId).toBe("urn:li:activity:1");
    expect(posts[0].reactions).toBe(50);
    expect(posts[0].reposts).toBe(2);
    expect(posts[1].externalId).toBe("2");
    expect(posts[1].views).toBe(500);
    expect(posts[1].reactions).toBe(10);
  });

  it("drops items with no discoverable external ID instead of fabricating one", async () => {
    mockFetchOnce([{ text: "No id here" }]);
    const posts = await provider.getPosts({
      targetUrl: "https://www.linkedin.com/in/example",
      targetType: "profile",
    });
    expect(posts).toHaveLength(0);
  });

  it("leaves unavailable metrics as null rather than inventing values", async () => {
    mockFetchOnce([{ id: "3", text: "Only likes known", likes: 12 }]);
    const posts = await provider.getPosts({
      targetUrl: "https://www.linkedin.com/in/example",
      targetType: "profile",
    });
    expect(posts[0].reactions).toBe(12);
    expect(posts[0].comments).toBeNull();
    expect(posts[0].reposts).toBeNull();
    expect(posts[0].saves).toBeNull();
  });

  it("throws AUTH_ERROR on a 401 response", async () => {
    mockFetchOnce({}, 401);
    await expect(
      provider.getPosts({ targetUrl: "https://www.linkedin.com/in/example", targetType: "profile" })
    ).rejects.toMatchObject({ code: "AUTH_ERROR" } as Partial<ProviderError>);
  });

  it("throws RATE_LIMITED on a 429 response", async () => {
    mockFetchOnce({}, 429);
    await expect(
      provider.getPosts({ targetUrl: "https://www.linkedin.com/in/example", targetType: "profile" })
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("rejects non-LinkedIn URLs before calling the API", async () => {
    await expect(
      provider.getPosts({ targetUrl: "https://example.com/not-linkedin", targetType: "profile" })
    ).rejects.toMatchObject({ code: "INVALID_URL" });
  });
});
