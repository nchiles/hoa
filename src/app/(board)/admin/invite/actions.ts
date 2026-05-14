"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBoard } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

const inviteSchema = z.object({
  lot_id: z.uuid("Invalid lot id"),
  email: z.email("Invalid email"),
});

export async function inviteHomeowner(formData: FormData) {
  const { supabase } = await requireBoard();

  const parsed = inviteSchema.safeParse({
    lot_id: formData.get("lot_id"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    redirect(
      `/admin/invite?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    redirect(
      "/admin/invite?error=" +
        encodeURIComponent(
          "Supabase secret key not configured. Add SUPABASE_SECRET_KEY to .env.local.",
        ),
    );
  }

  // Verify the email actually belongs to the lot. An invite must always tie
  // a known homeowner email to a real lot; we never want a magic link going
  // out to a random email that's not attached to a lot record.
  const { data: lot, error: lotErr } = await supabase
    .from("lots")
    .select("id, owner_email")
    .eq("id", parsed.data.lot_id)
    .maybeSingle();

  if (lotErr || !lot) {
    redirect(
      `/admin/invite?error=${encodeURIComponent("Lot not found.")}`,
    );
  }
  if (!lot.owner_email) {
    redirect(
      `/admin/invite?error=${encodeURIComponent("This lot has no owner email. Add one on the lot edit page first.")}`,
    );
  }
  if (lot.owner_email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    redirect(
      `/admin/invite?error=${encodeURIComponent("The invite email does not match the lot's owner_email. Refresh and try again.")}`,
    );
  }

  const admin = createAdminClient();
  const origin = (await headers()).get("origin") ?? "";
  const redirectTo = origin ? `${origin}/auth/callback` : undefined;

  // inviteUserByEmail creates a new auth user and emails a magic-link invite.
  // If the user already exists Supabase returns "User already registered" —
  // in that case fall back to a fresh OTP send so this action doubles as a
  // resend.
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { redirectTo },
  );

  if (inviteErr && /already (been )?registered|already exists/i.test(inviteErr.message)) {
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (otpErr) {
      redirect(`/admin/invite?error=${encodeURIComponent(otpErr.message)}`);
    }
    redirect(`/admin/invite?resent=${encodeURIComponent(parsed.data.email)}`);
  }

  if (inviteErr) {
    redirect(`/admin/invite?error=${encodeURIComponent(inviteErr.message)}`);
  }

  redirect(`/admin/invite?sent=${encodeURIComponent(parsed.data.email)}`);
}

const boardInviteSchema = z.object({
  email: z.email("Invalid email"),
});

// Invite a new board member by email. The role hint is passed in
// user_metadata so the handle_new_user() trigger creates the profiles row
// with role='board' on first signup — no follow-up SQL flip required.
// If the user already exists, fall back to a fresh OTP and (best-effort)
// promote the existing profile to board.
export async function inviteBoardMember(formData: FormData) {
  const { supabase } = await requireBoard();

  const parsed = boardInviteSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    redirect(
      `/admin/invite?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    redirect(
      "/admin/invite?error=" +
        encodeURIComponent(
          "Supabase secret key not configured. Add SUPABASE_SECRET_KEY to .env.local.",
        ),
    );
  }

  const admin = createAdminClient();
  const origin = (await headers()).get("origin") ?? "";
  const redirectTo = origin ? `${origin}/auth/callback` : undefined;

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { data: { role: "board" }, redirectTo },
  );

  if (
    inviteErr &&
    /already (been )?registered|already exists/i.test(inviteErr.message)
  ) {
    // Existing account: promote the profile to board, then send a fresh OTP.
    await admin
      .from("profiles")
      .update({ role: "board" })
      .eq("email", parsed.data.email);

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (otpErr) {
      redirect(`/admin/invite?error=${encodeURIComponent(otpErr.message)}`);
    }
    redirect(
      `/admin/invite?board_resent=${encodeURIComponent(parsed.data.email)}`,
    );
  }

  if (inviteErr) {
    redirect(`/admin/invite?error=${encodeURIComponent(inviteErr.message)}`);
  }

  redirect(`/admin/invite?board_sent=${encodeURIComponent(parsed.data.email)}`);
}
