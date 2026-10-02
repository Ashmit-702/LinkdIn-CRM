import { prisma } from "@/lib/prisma";
import { getLinkedInProvider } from "@/providers/linkedin";
import { IntegrationProvider, SyncStatus } from "@prisma/client";
import { NotFoundError } from "./contact-service";

// Simple in-memory rate limiter: refuse to sync the same integration
// more than once within this window. Prevents accidental hammering of
// the provider (and, for Apify, unnecessary actor-run cost).
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Runs a sync for one integration: calls the configured
 * LinkedInDataProvider, normalizes results, and upserts them, all while
 * recording a SyncLog row for observability. This is the ONLY place
 * that should be calling `getLinkedInProvider()` for the purposes of
 * populating the database.
 */
export async function syncIntegration(userId: string, integrationId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, userId },
  });
  if (!integration) throw new NotFoundError("Integration not found.");

  if (
    integration.lastSyncedAt &&
    Date.now() - integration.lastSyncedAt.getTime() < MIN_SYNC_INTERVAL_MS
  ) {
    const waitSecs = Math.ceil(
      (MIN_SYNC_INTERVAL_MS - (Date.now() - integration.lastSyncedAt.getTime())) / 1000
    );
    throw new RateLimitedLocallyError(
      `Please wait ${waitSecs}s before syncing this integration again.`
    );
  }

  const syncLog = await prisma.syncLog.create({
    data: {
      userId,
      integrationId,
      provider: integration.provider,
      syncType: "posts",
      status: SyncStatus.RUNNING,
    },
  });

  try {
    const provider = getLinkedInProvider();
    const posts = await provider.getPosts({
      targetUrl: integration.targetUrl,
      targetType: (integration.targetType as "profile" | "company") ?? "profile",
      limit: 50,
    });

    let processed = 0;
    for (const post of posts) {
      const impressions = post.impressions ?? post.views ?? null;
      const engagementRate = calculateEngagementRate({
        impressions,
        reactions: post.reactions ?? null,
        comments: post.comments ?? null,
        reposts: post.reposts ?? null,
      });

      await prisma.linkedinPost.upsert({
        where: {
          provider_externalId: {
            provider: integration.provider,
            externalId: post.externalId,
          },
        },
        create: {
          userId,
          integrationId: integration.id,
          externalId: post.externalId,
          provider: integration.provider,
          authorProfileUrl: post.authorProfileUrl ?? undefined,
          postUrl: post.postUrl ?? undefined,
          content: sanitizeText(post.content),
          publishedAt: post.publishedAt ?? undefined,
          impressions: post.impressions ?? undefined,
          views: post.views ?? undefined,
          reactions: post.reactions ?? undefined,
          comments: post.comments ?? undefined,
          reposts: post.reposts ?? undefined,
          saves: post.saves ?? undefined,
          clicks: post.clicks ?? undefined,
          engagementRate: engagementRate ?? undefined,
          rawProviderData: safeJson(post.raw),
          fetchedAt: new Date(),
        },
        update: {
          content: sanitizeText(post.content),
          impressions: post.impressions ?? undefined,
          views: post.views ?? undefined,
          reactions: post.reactions ?? undefined,
          comments: post.comments ?? undefined,
          reposts: post.reposts ?? undefined,
          saves: post.saves ?? undefined,
          clicks: post.clicks ?? undefined,
          engagementRate: engagementRate ?? undefined,
          rawProviderData: safeJson(post.raw),
          fetchedAt: new Date(),
        },
      });
      processed++;
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    });

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: posts.length === 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS,
        completedAt: new Date(),
        recordsProcessed: processed,
        errorMessage: posts.length === 0 ? "Provider returned no posts." : null,
      },
    });

    return { recordsProcessed: processed, status: posts.length === 0 ? "PARTIAL" : "SUCCESS" };
  } catch (err) {
    // Never store secrets or raw stack traces in the DB — just a safe message.
    const message = err instanceof Error ? err.message : "Unknown sync error.";
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        errorMessage: message.slice(0, 500),
      },
    });
    throw err;
  }
}

export async function getLastSyncStatus(userId: string, integrationId: string) {
  return prisma.syncLog.findFirst({
    where: { userId, integrationId },
    orderBy: { startedAt: "desc" },
  });
}

function calculateEngagementRate(input: {
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
}): number | null {
  if (!input.impressions || input.impressions <= 0) return null;
  const engagements = (input.reactions ?? 0) + (input.comments ?? 0) + (input.reposts ?? 0);
  return Number(((engagements / input.impressions) * 100).toFixed(2));
}

/** Strips control characters and caps length; display-time HTML escaping still happens in the UI layer. */
function sanitizeText(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 10000);
}

function safeJson(value: unknown) {
  try {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

export class RateLimitedLocallyError extends Error {}
export { IntegrationProvider };
