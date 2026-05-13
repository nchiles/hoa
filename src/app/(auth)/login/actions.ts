"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.email("Enter a valid email address.");

export async function signInWithMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    redirect(
      `/login?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }
  const email = parsed.data;

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  if (!origin) {
    redirect("/login?error=Origin%20missing");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      // Invite-only: never auto-create users from the login form. Members must
      // already have been invited by the board before they can sign in.
      shouldCreateUser: false,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/login?sent=${encodeURIComponent(email)}`);
}
