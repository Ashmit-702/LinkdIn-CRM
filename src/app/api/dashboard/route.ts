import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { getDashboardData } from "@/services/dashboard-service";

export async function GET() {
  try {
    const userId = await requireUserId();
    const data = await getDashboardData(userId);
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
