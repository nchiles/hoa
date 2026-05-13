"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBoard } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({
  lot_id: z.uuid("Invalid lot id"),
  email: z.email("Invalid email"),
});

export async function inviteHomeowner(formData: FormData) {
  await requireBoard();

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
    const supabase = await createClient();
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
