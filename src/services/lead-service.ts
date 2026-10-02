import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { leadCreateSchema, leadUpdateSchema } from "@/lib/validations";
import { NotFoundError } from "./contact-service";

type LeadCreateInput = z.infer<typeof leadCreateSchema>;
type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

export async function listLeads(userId: string, opts: { status?: string } = {}) {
  return prisma.lead.findMany({
    where: { userId, ...(opts.status ? { status: opts.status as never } : {}) },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLead(userId: string, input: LeadCreateInput) {
  const data = leadCreateSchema.parse(input);

  const contact = await prisma.contact.findFirst({
    where: { id: data.contactId, userId },
  });
  if (!contact) throw new NotFoundError("Contact not found.");

  return prisma.lead.create({
    data: {
      userId,
      contactId: data.contactId,
      title: data.title,
      status: data.status ?? "NEW",
      value: data.value,
      source: data.source,
    },
  });
}

export async function updateLead(userId: string, leadId: string, input: LeadUpdateInput) {
  const data = leadUpdateSchema.parse(input);
  const existing = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!existing) throw new NotFoundError("Lead not found.");

  return prisma.lead.update({ where: { id: leadId }, data });
}

export async function pipelineSummary(userId: string) {
  const leads = await prisma.lead.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });

  const statuses = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;
  return statuses.map((status) => ({
    status,
    count: leads.find((l: (typeof leads)[number]) => l.status === status)?._count._all ?? 0,
  }));
}
