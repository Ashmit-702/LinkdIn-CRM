import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      passwordHash,
    },
  });

  const contact = await prisma.contact.upsert({
    where: { id: "seed-contact-1" },
    update: {},
    create: {
      id: "seed-contact-1",
      userId: user.id,
      name: "Jordan Ellery",
      email: "jordan@northwind.example",
      company: "Northwind Digital",
      jobTitle: "VP of Partnerships",
      linkedinUrl: "https://www.linkedin.com/in/jordan-ellery-demo",
      leadStatus: "QUALIFIED",
      leadSource: "LinkedIn",
      tags: ["warm", "enterprise"],
    },
  });

  await prisma.lead.upsert({
    where: { id: "seed-lead-1" },
    update: {},
    create: {
      id: "seed-lead-1",
      userId: user.id,
      contactId: contact.id,
      title: "Northwind Digital — Platform expansion",
      status: "QUALIFIED",
      value: 42000,
      source: "LinkedIn outbound",
    },
  });

  await prisma.integration.upsert({
    where: { id: "seed-integration-1" },
    update: {},
    create: {
      id: "seed-integration-1",
      userId: user.id,
      provider: "MOCK",
      targetType: "profile",
      targetUrl: "https://www.linkedin.com/in/jordan-ellery-demo",
      label: "Company page (demo)",
    },
  });

  console.log("Seeded demo user: demo@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
