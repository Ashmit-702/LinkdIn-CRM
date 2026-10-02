import { prisma } from "@/lib/prisma";
import { getLinkedInSummary } from "./analytics-service";
import { pipelineSummary } from "./lead-service";

export async function getDashboardData(userId: string) {
  const [totalContacts, totalLeads, qualifiedLeads, linkedinSummary, pipeline] =
    await Promise.all([
      prisma.contact.count({ where: { userId } }),
      prisma.lead.count({ where: { userId } }),
      prisma.lead.count({ where: { userId, status: "QUALIFIED" } }),
      getLinkedInSummary(userId),
      pipelineSummary(userId),
    ]);

  const wonLeads = pipeline.find((p) => p.status === "WON")?.count ?? 0;
  const conversionRate = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : null; // calculated

  return {
    kpis: {
      totalContacts,
      totalLeads,
      qualifiedLeads,
      totalPosts: linkedinSummary.totalPosts,
      totalImpressions: linkedinSummary.totalImpressions,
      totalReactions: linkedinSummary.totalReactions,
      totalComments: linkedinSummary.totalComments,
      averageEngagementRate: linkedinSummary.averageEngagementRate,
    },
    pipeline,
    conversionRate,
    topPosts: linkedinSummary.topPosts,
  };
}
