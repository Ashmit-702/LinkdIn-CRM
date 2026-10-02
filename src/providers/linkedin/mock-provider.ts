import { LinkedInDataProvider } from "./interface";
import {
  ProfileInput,
  PostsInput,
  AnalyticsInput,
  LinkedInProfile,
  LinkedInPost,
  LinkedInAnalytics,
  LinkedInCompanyData,
} from "./types";

/**
 * MockLinkedInProvider
 * ---------------------------------------------------------------------
 * Returns realistic, deterministic-ish fake data so the rest of the app
 * (UI, sync pipeline, analytics, dashboard) can be built and tested with
 * zero external dependencies and no Apify token. This is the default
 * provider (`LINKEDIN_PROVIDER=mock`).
 */
export class MockLinkedInProvider implements LinkedInDataProvider {
  async getProfile(input: ProfileInput): Promise<LinkedInProfile> {
    const seed = hashString(input.targetUrl);
    return {
      sourceUrl: input.targetUrl,
      fullName: "Jordan Ellery",
      headline: "VP of Partnerships at Northwind Digital",
      company: "Northwind Digital",
      followerCount: 4000 + (seed % 6000),
      profileImageUrl: null,
    };
  }

  async getPosts(input: PostsInput): Promise<LinkedInPost[]> {
    const count = Math.min(input.limit ?? 12, 25);
    const seed = hashString(input.targetUrl);
    const posts: LinkedInPost[] = [];

    for (let i = 0; i < count; i++) {
      const daysAgo = i * 4 + (seed % 3);
      const publishedAt = new Date();
      publishedAt.setDate(publishedAt.getDate() - daysAgo);

      const impressions = 800 + ((seed + i * 137) % 9000);
      const reactions = Math.round(impressions * (0.02 + ((seed + i) % 5) * 0.01));
      const comments = Math.round(reactions * 0.15);
      const reposts = Math.round(reactions * 0.05);

      posts.push({
        externalId: `mock-${seed}-${i}`,
        authorProfileUrl: input.targetUrl,
        postUrl: `https://www.linkedin.com/feed/update/mock-${seed}-${i}`,
        content: MOCK_POST_TEXTS[i % MOCK_POST_TEXTS.length],
        publishedAt,
        impressions,
        views: null, // not every source distinguishes views from impressions
        reactions,
        comments,
        reposts,
        saves: null,
        clicks: null,
        raw: { mock: true, index: i },
      });
    }

    if (input.since) {
      return posts.filter((p) => (p.publishedAt ?? new Date(0)) >= input.since!);
    }
    return posts;
  }

  async getAnalytics(_input: AnalyticsInput): Promise<LinkedInAnalytics> {
    // The mock provider intentionally doesn't return pre-aggregated
    // analytics — like most real providers, aggregation happens in
    // services/analytics-service.ts from the normalized post data.
    return {
      totalPosts: null,
      totalImpressions: null,
      totalReactions: null,
      totalComments: null,
      totalReposts: null,
    };
  }

  async getCompanyData(input: ProfileInput): Promise<LinkedInCompanyData> {
    return {
      sourceUrl: input.targetUrl,
      companyName: "Northwind Digital",
      followerCount: 12500,
      employeeCountRange: "51-200",
    };
  }
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const MOCK_POST_TEXTS = [
  "Excited to share our Q3 partnership results — a huge team effort.",
  "Three lessons from scaling a B2B outbound motion this year.",
  "We just published a new case study on customer retention strategy.",
  "Grateful for the conversations at this week's industry roundtable.",
  "Hiring update: our partnerships team is growing — link in comments.",
  "A quick thread on what changed in our onboarding flow and why.",
];
