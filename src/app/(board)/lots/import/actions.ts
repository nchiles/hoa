"use server";

import { redirect } from "next/navigation";
import { requireBoard } from "@/lib/auth/requireRole";
import { csvRowSchema, parseAndValidateCsv } from "@/lib/validators/lotCsv";
import { z } from "zod";

export type ImportState =
  | { stage: "idle" }
  | {
      stage: "preview";
      rows: z.infer<typeof csvRowSchema>[];
      payload: string; // JSON of rows for the commit step
    }
  | {
      stage: "error";
      message: string;
      rowErrors?: { line: number; message: string }[];
    };

export async function parseCsvAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireBoard();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { stage: "error", message: "Please choose a CSV file." };
  }
  if (file.size > 1_000_000) {
    return { stage: "error", message: "CSV is too large (limit 1MB)." };
  }
  const text = await file.text();
  const result = parseAndValidateCsv(text);
  if (!result.ok) {
    return {
      stage: "error",
      message: result.error,
      rowErrors: result.rowErrors,
    };
  }
  return {
    stage: "preview",
    rows: result.rows,
    payload: JSON.stringify(result.rows),
  };
}

export async function commitCsvImport(formData: FormData) {
  const { supabase } = await requireBoard();
  const payload = formData.get("payload");
  if (typeof payload !== "string" || payload.length === 0) {
    redirect("/lots/import?error=Missing+payload");
  }

  let parsedRows: unknown;
  try {
    parsedRows = JSON.parse(payload as string);
  } catch {
    redirect("/lots/import?error=Invalid+payload");
  }
  const validated = z.array(csvRowSchema).safeParse(parsedRows);
  if (!validated.success) {
    redirect(
      `/lots/import?error=${encodeURIComponent("Validation failed on commit. Re-upload the file.")}`,
    );
  }

  const { error, count } = await supabase
    .from("lots")
    .insert(validated.data, { count: "exact" });

  if (error) {
    // Likely a unique-violation on lot_number against existing rows.
    redirect(
      `/lots/import?error=${encodeURIComponent(`Import failed: ${error.message}`)}`,
    );
  }

  redirect(`/lots?imported=${count ?? validated.data.length}`);
}
