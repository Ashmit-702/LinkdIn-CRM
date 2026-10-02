import { LinkedInDataProvider } from "./interface";
import {
  ProfileInput,
  PostsInput,
  AnalyticsInput,
  LinkedInProfile,
  LinkedInPost,
  LinkedInAnalytics,
  LinkedInCompanyData,
  ProviderError,
} from "./types";

const APIFY_BASE_URL = "https://api.apify.com/v2";

interface ApifyConfig {
  apiToken: string;
  postsActorId?: string;
  companyActorId?: string;
  runTimeoutSecs: number;
  maxItemsPerSync: number;
}

/**
 * ApifyLinkedInProvider
 * ---------------------------------------------------------------------
 * Talks to Apify actors to retrieve PUBLIC LinkedIn post/profile data for
 * a single, explicitly-configured target URL (the user's own profile or
 * a company page they're authorized to monitor). All actor-specific
 * field mapping is isolated here — nothing outside this file knows the
 * shape of a raw Apify dataset item.
 *
 * IMPORTANT: This implementation does not assume a fixed schema from any
 * particular actor. `normalizePostItem` reads defensively from several
 * commonly-used field name variants and falls back to `null` for
 * anything it can't find, per the "never fabricate data" requirement.
 * Before going to production, verify the exact output schema of the
 * actor you configure via APIFY_POSTS_ACTOR_ID and adjust the mapping
 * in `normalizePostItem` if needed.
 */
export class ApifyLinkedInProvider implements LinkedInDataProvider {
  private config: ApifyConfig;

  constructor(config: ApifyConfig) {
    if (!config.apiToken) {
      throw new ProviderError(
        "Apify provider selected but APIFY_API_TOKEN is not configured.",
        "AUTH_ERROR"
      );
    }
    this.config = config;
  }

  async getProfile(input: ProfileInput): Promise<LinkedInProfile> {
    // Minimal profile info can often be derived from the first post
    // item's author fields, since a dedicated profile actor isn't part
    // of every Apify plan. Callers that need richer profile data should
    // configure a profile-specific actor and extend this method.
    validateLinkedInUrl(input.targetUrl);
    return {
      sourceUrl: input.targetUrl,
      fullName: null,
      headline: null,
      company: null,
      followerCount: null,
      profileImageUrl: null,
    };
  }

  async getPosts(input: PostsInput): Promise<LinkedInPost[]> {
    validateLinkedInUrl(input.targetUrl);

    if (!this.config.postsActorId) {
      throw new ProviderError(
        "APIFY_POSTS_ACTOR_ID is not configured.",
        "ACTOR_FAILED"
      );
    }

    const limit = Math.min(input.limit ?? this.config.maxItemsPerSync, this.config.maxItemsPerSync);

    const runInput = {
      // NOTE: exact input keys depend on the actor you choose. Adjust
      // this object to match your actor's documented input schema.
      profileUrls: [input.targetUrl],
      maxPosts: limit,
    };

    const items = await this.runActorAndGetItems(this.config.postsActorId, runInput);

    return items
      .map((item) => normalizePostItem(item))
      .filter((post): post is LinkedInPost => post !== null);
  }

  async getAnalytics(_input: AnalyticsInput): Promise<LinkedInAnalytics> {
    // Most Apify actors don't return pre-aggregated analytics — we
    // compute aggregates ourselves from normalized posts in
    // services/analytics-service.ts.
    return {
      totalPosts: null,
      totalImpressions: null,
      totalReactions: null,
      totalComments: null,
      totalReposts: null,
    };
  }

  async getCompanyData(input: ProfileInput): Promise<LinkedInCompanyData> {
    validateLinkedInUrl(input.targetUrl);

    if (!this.config.companyActorId) {
      throw new ProviderError(
        "APIFY_COMPANY_ACTOR_ID is not configured.",
        "ACTOR_FAILED"
      );
    }

    const items = await this.runActorAndGetItems(this.config.companyActorId, {
      companyUrls: [input.targetUrl],
    });

    const first = items[0] as Record<string, unknown> | undefined;
    if (!first) {
      throw new ProviderError("Company actor returned no data.", "EMPTY_RESULT");
    }

    return {
      sourceUrl: input.targetUrl,
      companyName: readString(first, ["companyName", "name", "title"]),
      followerCount: readNumber(first, ["followerCount", "followers"]),
      employeeCountRange: readString(first, ["employeeCountRange", "companySize"]),
    };
  }

  // -------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------

  private async runActorAndGetItems(
    actorId: string,
    runInput: Record<string, unknown>
  ): Promise<unknown[]> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.runTimeoutSecs * 1000
    );

    try {
      // `run-sync-get-dataset-items` starts the actor and blocks (up to
      // Apify's own limits) until the run finishes, returning the
      // dataset items directly — avoids implementing our own polling
      // loop, which keeps us from hammering the API.
      const url = `${APIFY_BASE_URL}/acts/${encodeURIComponent(
        actorId
      )}/run-sync-get-dataset-items?token=${encodeURIComponent(this.config.apiToken)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runInput),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new ProviderError("Apify authentication failed.", "AUTH_ERROR");
      }
      if (res.status === 429) {
        throw new ProviderError("Apify rate limit exceeded.", "RATE_LIMITED");
      }
      if (!res.ok) {
        throw new ProviderError(
          `Apify actor run failed with status ${res.status}.`,
          "ACTOR_FAILED"
        );
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new ProviderError(
          "Unexpected Apify response shape (expected an array of dataset items).",
          "MALFORMED_DATA"
        );
      }
      return data;
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("Apify actor run timed out.", "TIMEOUT", err);
      }
      throw new ProviderError("Unexpected error calling Apify.", "UNKNOWN", err);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function validateLinkedInUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ProviderError(`"${url}" is not a valid URL.`, "INVALID_URL");
  }
  if (!parsed.hostname.endsWith("linkedin.com")) {
    throw new ProviderError(
      `"${url}" does not look like a LinkedIn URL.`,
      "INVALID_URL"
    );
  }
}

/**
 * Normalizes a single raw Apify dataset item into our internal
 * LinkedInPost shape. Reads defensively across a few common field name
 * variants used by publicly listed LinkedIn post-scraper actors, and
 * returns `null` fields (never fabricated values) for anything absent.
 */
function normalizePostItem(raw: unknown): LinkedInPost | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;

  const externalId =
    readString(item, ["id", "postId", "urn", "activityId"]) ??
    readString(item, ["postUrl", "url"]);

  if (!externalId) {
    // Without a stable external ID we can't de-duplicate on future
    // syncs, so skip the item rather than risk creating duplicates.
    return null;
  }

  return {
    externalId,
    authorProfileUrl: readString(item, ["authorProfileUrl", "authorUrl", "profileUrl"]),
    postUrl: readString(item, ["postUrl", "url", "link"]),
    content: readString(item, ["text", "content", "postText"]),
    publishedAt: readDate(item, ["publishedAt", "postedAt", "date", "timestamp"]),
    impressions: readNumber(item, ["impressions", "impressionCount", "views"]),
    views: readNumber(item, ["views", "viewCount"]),
    reactions: readNumber(item, ["reactions", "likes", "numLikes", "reactionCount"]),
    comments: readNumber(item, ["comments", "numComments", "commentCount"]),
    reposts: readNumber(item, ["reposts", "shares", "numShares", "repostCount"]),
    saves: readNumber(item, ["saves", "saveCount"]),
    clicks: readNumber(item, ["clicks", "clickCount"]),
    raw: item,
  };
}

function readString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

function readNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function readDate(obj: Record<string, unknown>, keys: string[]): Date | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}
