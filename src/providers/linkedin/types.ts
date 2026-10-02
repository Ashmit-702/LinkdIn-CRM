// Internal, provider-agnostic types. Nothing in this file may reference
// Apify or any other specific provider — that lives only in each
// provider's own implementation file.

export type LinkedInTargetType = "profile" | "company";

export interface ProfileInput {
  /** The authorized public LinkedIn profile or company URL to look up. */
  targetUrl: string;
  targetType: LinkedInTargetType;
}

export interface PostsInput {
  targetUrl: string;
  targetType: LinkedInTargetType;
  /** Only fetch posts published after this date, if supported by the provider. */
  since?: Date;
  /** Soft cap on number of posts to retrieve in one call. */
  limit?: number;
}

export interface AnalyticsInput {
  targetUrl: string;
  targetType: LinkedInTargetType;
}

/**
 * Normalized profile shape. Every field is optional except the ones we can
 * always guarantee, because different providers (and even different Apify
 * actors) expose different subsets of data. Never invent a value for a
 * field the provider didn't return — use `null`/`undefined` instead.
 */
export interface LinkedInProfile {
  sourceUrl: string;
  fullName?: string | null;
  headline?: string | null;
  company?: string | null;
  followerCount?: number | null;
  profileImageUrl?: string | null;
}

/** Normalized post shape — maps 1:1 to the LinkedinPost Prisma model's provider-supplied fields. */
export interface LinkedInPost {
  externalId: string;
  authorProfileUrl?: string | null;
  postUrl?: string | null;
  content?: string | null;
  publishedAt?: Date | null;

  impressions?: number | null;
  views?: number | null;
  reactions?: number | null;
  comments?: number | null;
  reposts?: number | null;
  saves?: number | null;
  clicks?: number | null;

  /** The untouched, provider-specific payload — kept for debugging/audit, never shown raw to end users. */
  raw?: unknown;
}

/** Aggregate analytics, when a provider can compute/return them directly (rare — most providers only return posts, and we calculate aggregates ourselves in services/analytics-service.ts). */
export interface LinkedInAnalytics {
  totalPosts?: number | null;
  totalImpressions?: number | null;
  totalReactions?: number | null;
  totalComments?: number | null;
  totalReposts?: number | null;
}

export interface LinkedInCompanyData {
  sourceUrl: string;
  companyName?: string | null;
  followerCount?: number | null;
  employeeCountRange?: string | null;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_URL"
      | "TIMEOUT"
      | "RATE_LIMITED"
      | "AUTH_ERROR"
      | "ACTOR_FAILED"
      | "EMPTY_RESULT"
      | "MALFORMED_DATA"
      | "UNKNOWN",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
