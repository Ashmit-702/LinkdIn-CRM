import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { updateLead } from "@/services/lead-service";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const lead = await updateLead(userId, params.id, body);
    return NextResponse.json({ lead });
  } catch (err) {
    return handleApiError(err);
  }
}
