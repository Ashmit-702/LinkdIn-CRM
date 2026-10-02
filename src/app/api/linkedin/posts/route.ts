import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { listPosts } from "@/services/analytics-service";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 100);
    const posts = await listPosts(userId, { limit });
    return NextResponse.json({ posts });
  } catch (err) {
    return handleApiError(err);
  }
}
