"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/requireRole";

async function setStatus(id: string, status: "active" | "rejected") {
  const { supabase } = await requireBoard();
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id)
    .eq("status", "pending"); // only act on still-pending rows
  if (error) {
    redirect(`/admin/approvals?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin/approvals");
}

export async function approveProfile(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/approvals?error=Missing+id");
  await setStatus(id, "active");
  redirect("/admin/approvals?approved=1");
}

export async function rejectProfile(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/approvals?error=Missing+id");
  await setStatus(id, "rejected");
  redirect("/admin/approvals?rejected=1");
}
