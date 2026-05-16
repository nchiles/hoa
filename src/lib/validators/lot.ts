import { z } from "zod";

// `''` means "field left blank" — we coerce to null before insert/update.
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

export const lotFormSchema = z.object({
  lot_number: z.string().trim().min(1, "Required").max(32),
  street_number: z.string().trim().min(1, "Required").max(32),
  street_name: z.string().trim().min(1, "Required").max(128),
  owner_name: optionalText(128),
  owner_email: optionalEmail,
  owner_phone: optionalText(32),
  notes: optionalText(2000),
});

export type LotFormInput = z.infer<typeof lotFormSchema>;

export function parseLotForm(formData: FormData) {
  return lotFormSchema.safeParse({
    lot_number: formData.get("lot_number"),
    street_number: formData.get("street_number"),
    street_name: formData.get("street_name"),
    owner_name: formData.get("owner_name"),
    owner_email: formData.get("owner_email"),
    owner_phone: formData.get("owner_phone"),
    notes: formData.get("notes"),
  });
}
