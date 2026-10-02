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
 * LinkedInDataProvider
 * ---------------------------------------------------------------------
 * Every LinkedIn data source (Apify today, the official LinkedIn API in
 * the future) implements this interface. Nothing outside `/providers`
 * should ever import a concrete provider class directly — always go
 * through `getLinkedInProvider()` in `./index.ts`.
 *
 * Rules for implementers:
 *  - Never invent a value for a field the underlying source doesn't
 *    actually supply. Return `null`/`undefined` instead.
 *  - Throw `ProviderError` (see ./types.ts) with an appropriate `code`
 *    for anything the caller needs to handle distinctly (rate limits,
 *    timeouts, invalid URLs, etc).
 *  - Do not perform any surveillance-style operations: no arbitrary
 *    profile lookups, no private messages, no connection-graph
 *    harvesting. Only the explicitly configured target URL.
 */
export interface LinkedInDataProvider {
  getProfile(input: ProfileInput): Promise<LinkedInProfile>;
  getPosts(input: PostsInput): Promise<LinkedInPost[]>;
  getAnalytics(input: AnalyticsInput): Promise<LinkedInAnalytics>;
  getCompanyData?(input: ProfileInput): Promise<LinkedInCompanyData>;
}
