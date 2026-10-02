import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { getLinkedInSummary, getEngagementTrend } from "@/services/analytics-service";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [summary, trend] = await Promise.all([
      getLinkedInSummary(userId),
      getEngagementTrend(userId),
    ]);
    return NextResponse.json({ summary, trend });
  } catch (err) {
    return handleApiError(err);
  }
}
