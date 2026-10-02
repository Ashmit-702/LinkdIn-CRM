import { LinkedInDataProvider } from "./interface";
import { MockLinkedInProvider } from "./mock-provider";
import { ApifyLinkedInProvider } from "./apify-provider";

/**
 * Factory — the ONLY place in the application allowed to decide which
 * concrete provider implementation to use. Everything else (API routes,
 * services, UI) must depend on `LinkedInDataProvider`, never on
 * `ApifyLinkedInProvider` or `MockLinkedInProvider` directly.
 *
 * Adding official LinkedIn API support later means adding a case here
 * for `OfficialLinkedInProvider` — no other file needs to change.
 */
let cachedProvider: LinkedInDataProvider | null = null;

export function getLinkedInProvider(): LinkedInDataProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.LINKEDIN_PROVIDER ?? "mock").toLowerCase();

  switch (providerName) {
    case "apify":
      cachedProvider = new ApifyLinkedInProvider({
        apiToken: process.env.APIFY_API_TOKEN ?? "",
        postsActorId: process.env.APIFY_POSTS_ACTOR_ID,
        companyActorId: process.env.APIFY_COMPANY_ACTOR_ID,
        runTimeoutSecs: Number(process.env.APIFY_RUN_TIMEOUT_SECS ?? 120),
        maxItemsPerSync: Number(process.env.APIFY_MAX_ITEMS_PER_SYNC ?? 50),
      });
      break;
    case "mock":
    default:
      cachedProvider = new MockLinkedInProvider();
      break;
  }

  return cachedProvider;
}

/** For tests: reset the cached singleton between test cases. */
export function __resetProviderCache(): void {
  cachedProvider = null;
}

export type { LinkedInDataProvider } from "./interface";
export * from "./types";
