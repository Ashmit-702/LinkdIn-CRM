import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { integrationCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const userId = await requireUserId();
    const integrations = await prisma.integration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ integrations });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const data = integrationCreateSchema.parse(body);

    const providerName = (process.env.LINKEDIN_PROVIDER ?? "mock").toUpperCase() as
      | "MOCK"
      | "APIFY";

    const integration = await prisma.integration.create({
      data: {
        userId,
        provider: providerName,
        targetType: data.targetType,
        targetUrl: data.targetUrl,
        label: data.label,
      },
    });
    return NextResponse.json({ integration }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
