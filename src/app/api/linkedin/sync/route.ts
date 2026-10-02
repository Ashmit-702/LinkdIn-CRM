import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { syncIntegration, RateLimitedLocallyError } from "@/services/sync-service";
import { syncRequestSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { integrationId } = syncRequestSchema.parse(body);

    const result = await syncIntegration(userId, integrationId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RateLimitedLocallyError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return handleApiError(err);
  }
}
