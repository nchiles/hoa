"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/requireRole";
import { parseLotForm } from "@/lib/validators/lot";

export async function createLot(formData: FormData) {
  const { supabase } = await requireBoard();
  const parsed = parseLotForm(formData);
  if (!parsed.success) {
    redirect(
      `/lots/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const { data, error } = await supabase
    .from("lots")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    redirect(`/lots/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/lots");
  redirect(`/lots/${data.id}`);
}

export async function updateLot(id: string, formData: FormData) {
  const { supabase } = await requireBoard();
  const parsed = parseLotForm(formData);
  if (!parsed.success) {
    redirect(
      `/lots/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const { error } = await supabase
    .from("lots")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    redirect(`/lots/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/lots/${id}`);
  revalidatePath("/lots");
  redirect(`/lots/${id}`);
}

/**
 * Offboard a lot when ownership transfers. Clears owner PII columns and
 * detaches any profiles still pointing at this lot, but preserves the
 * dues_payments rows as the audit trail required by the PRD.
 */
export async function offboardLot(id: string) {
  const { supabase } = await requireBoard();

  // Detach any profiles linked to this lot first so the old owner doesn't
  // keep seeing PII-stripped lot data on /me.
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ lot_id: null })
    .eq("lot_id", id);
  if (profileErr) {
    redirect(`/lots/${id}/edit?error=${encodeURIComponent(profileErr.message)}`);
  }

  const { error } = await supabase
    .from("lots")
    .update({
      owner_name: null,
      owner_email: null,
      owner_phone: null,
      notes: null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/lots/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/lots/${id}`);
  revalidatePath("/lots");
  redirect(`/lots/${id}?offboarded=1`);
}
