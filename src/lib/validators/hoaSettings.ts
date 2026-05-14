import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalEmail = z
  .string()
  .trim()
  .or(z.literal(""))
  .optional()
  .transform((v) => (v && v.length > 0 ? v.toLowerCase() : null))
  .pipe(z.email().nullable());

export const hoaSettingsSchema = z.object({
  name: z.string().trim().min(1, "Required").max(128),
  contact_email: optionalEmail,
  mailing_address: optionalText(512),
  fiscal_year_start_month: z.coerce
    .number()
    .int()
    .min(1)
    .max(12),
  default_dues_amount_cents: z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000_000),
});

export type HoaSettingsInput = z.infer<typeof hoaSettingsSchema>;

export function parseHoaSettings(formData: FormData) {
  return hoaSettingsSchema.safeParse({
    name: formData.get("name"),
    contact_email: formData.get("contact_email"),
    mailing_address: formData.get("mailing_address"),
    fiscal_year_start_month: formData.get("fiscal_year_start_month"),
    default_dues_amount_cents: formData.get("default_dues_amount_cents"),
  });
}
