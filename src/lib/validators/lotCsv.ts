import { z } from "zod";

const blank = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = (max: number) =>
  z.preprocess(
    blank,
    z.string().trim().max(max).nullable().optional().transform((v) => v ?? null),
  );

const optionalEmail = z.preprocess(
  blank,
  z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
);

export const csvRowSchema = z.object({
  lot_number: z.string().trim().min(1, "lot_number required").max(32),
  address: z.string().trim().min(1, "address required").max(256),
  owner_name: optionalText(128),
  owner_email: optionalEmail,
  owner_phone: optionalText(32),
  notes: optionalText(2000),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export const REQUIRED_HEADERS = [
  "lot_number",
  "address",
  "owner_name",
  "owner_email",
  "owner_phone",
  "notes",
] as const;

// Minimal RFC-4180-ish CSV parser. Handles double-quoted fields with embedded
// commas and "" escapes. We control the expected schema, so we don't need a
// general-purpose library here.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");

  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
      } else {
        field += c;
        i++;
      }
    }
  }
  // Trailing field/row (file may not end with newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type CsvParseResult =
  | { ok: true; rows: CsvRow[] }
  | { ok: false; error: string; rowErrors?: { line: number; message: string }[] };

export function parseAndValidateCsv(text: string): CsvParseResult {
  const grid = parseCsv(text);
  if (grid.length === 0) return { ok: false, error: "CSV is empty." };

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required columns: ${missing.join(", ")}. Expected header: ${REQUIRED_HEADERS.join(",")}`,
    };
  }

  const idx = Object.fromEntries(
    REQUIRED_HEADERS.map((h) => [h, header.indexOf(h)]),
  ) as Record<(typeof REQUIRED_HEADERS)[number], number>;

  const rowErrors: { line: number; message: string }[] = [];
  const rows: CsvRow[] = [];

  for (let r = 1; r < grid.length; r++) {
    const raw = grid[r];
    const parsed = csvRowSchema.safeParse({
      lot_number: raw[idx.lot_number],
      address: raw[idx.address],
      owner_name: raw[idx.owner_name],
      owner_email: raw[idx.owner_email],
      owner_phone: raw[idx.owner_phone],
      notes: raw[idx.notes],
    });
    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      rowErrors.push({
        line: r + 1,
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }
  }

  // Duplicate lot_number detection within the file itself.
  const seen = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const key = rows[i].lot_number.toLowerCase();
    if (seen.has(key)) {
      rowErrors.push({
        line: i + 2, // rough — header + 1-indexed
        message: `Duplicate lot_number in file: ${rows[i].lot_number}`,
      });
    } else {
      seen.set(key, i);
    }
  }

  if (rowErrors.length > 0) {
    return {
      ok: false,
      error: `${rowErrors.length} row(s) have errors. Fix and re-upload.`,
      rowErrors,
    };
  }

  return { ok: true, rows };
}
