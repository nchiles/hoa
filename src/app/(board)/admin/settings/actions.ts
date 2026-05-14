"use server";

import { redirect } from "next/navigation";
import { requireBoard } from "@/lib/auth/requireRole";
import { parseHoaSettings } from "@/lib/validators/hoaSettings";

export async function updateHoaSettings(formData: FormData) {
  const { supabase, profile } = await requireBoard();

  const parsed = parseHoaSettings(formData);
  if (!parsed.success) {
    redirect(
      `/admin/settings?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const { error } = await supabase
    .from("hoa_settings")
    .update({ ...parsed.data, updated_by: profile.id })
    .eq("id", 1);

  if (error) {
    redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/settings?saved=1");
}
