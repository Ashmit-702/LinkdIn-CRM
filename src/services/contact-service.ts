import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { contactCreateSchema, contactUpdateSchema } from "@/lib/validations";

type ContactCreateInput = z.infer<typeof contactCreateSchema>;
type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

export async function listContacts(
  userId: string,
  opts: { search?: string; status?: string } = {}
) {
  return prisma.contact.findMany({
    where: {
      userId,
      ...(opts.status ? { leadStatus: opts.status as never } : {}),
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search, mode: "insensitive" } },
              { email: { contains: opts.search, mode: "insensitive" } },
              { company: { contains: opts.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createContact(userId: string, input: ContactCreateInput) {
  const data = contactCreateSchema.parse(input);
  return prisma.contact.create({
    data: {
      userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      jobTitle: data.jobTitle,
      linkedinUrl: data.linkedinUrl,
      leadStatus: data.leadStatus ?? "NEW",
      leadSource: data.leadSource,
      tags: data.tags ?? [],
    },
  });
}

export async function updateContact(
  userId: string,
  contactId: string,
  input: ContactUpdateInput
) {
  const data = contactUpdateSchema.parse(input);
  const existing = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!existing) throw new NotFoundError("Contact not found.");

  return prisma.contact.update({
    where: { id: contactId },
    data,
  });
}

export async function deleteContact(userId: string, contactId: string) {
  const existing = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!existing) throw new NotFoundError("Contact not found.");
  await prisma.contact.delete({ where: { id: contactId } });
}

export class NotFoundError extends Error {}
