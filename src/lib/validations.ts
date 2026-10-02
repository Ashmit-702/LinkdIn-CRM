import { z } from "zod";

export const leadStatusEnum = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
]);

export const contactCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || undefined),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  linkedinUrl: z
    .string()
    .url()
    .refine((url) => new URL(url).hostname.endsWith("linkedin.com"), {
      message: "Must be a linkedin.com URL",
    })
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  leadStatus: leadStatusEnum.optional(),
  leadSource: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const contactUpdateSchema = contactCreateSchema.partial();

export const leadCreateSchema = z.object({
  contactId: z.string().min(1),
  title: z.string().min(1).max(200),
  status: leadStatusEnum.optional(),
  value: z.number().nonnegative().optional(),
  source: z.string().max(200).optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial().omit({ contactId: true });

export const noteCreateSchema = z.object({
  contactId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export const taskCreateSchema = z.object({
  contactId: z.string().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  dueAt: z.coerce.date().optional(),
});

export const integrationCreateSchema = z.object({
  targetUrl: z
    .string()
    .url()
    .refine((url) => new URL(url).hostname.endsWith("linkedin.com"), {
      message: "Must be a linkedin.com URL",
    }),
  targetType: z.enum(["profile", "company"]).default("profile"),
  label: z.string().max(200).optional(),
});

export const syncRequestSchema = z.object({
  integrationId: z.string().min(1),
});
