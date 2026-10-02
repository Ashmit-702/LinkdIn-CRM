import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { listContacts, createContact } from "@/services/contact-service";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const contacts = await listContacts(userId, {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return NextResponse.json({ contacts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const contact = await createContact(userId, body);
    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
