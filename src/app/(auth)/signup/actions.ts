"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SignupState =
  | { stage: "idle"; error?: string }
  // Lot matches and has an owner_email on file. We don't reveal the email —
  // user must enter it and we match server-side.
  | { stage: "matched"; address: string; emailHint: string }
  // Lot matches but the board hasn't set owner_email yet. Self-signup blocked.
  | { stage: "matched_no_email"; address: string }
  // No address match AND no board exists yet → "are you the president?" path.
  | { stage: "no_match_bootstrap"; address: string }
  // No address match but a board already runs this HOA → dead-end.
  | { stage: "no_match_locked"; address: string }
  | { stage: "sent"; email: string; role: "member" | "board" };

const emailSchema = z.email("Enter a valid email.");

function normalizeAddress(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

function emailHint(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const masked =
    local.length <= 2
      ? local[0] + "•"
      : local[0] + "•••" + local[local.length - 1];
  return `${masked}@${domain}`;
}

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const intent = String(formData.get("intent") ?? "");
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const redirectTo = origin ? `${origin}/auth/callback` : undefined;

  if (intent === "lookup_address") {
    const address = String(formData.get("address") ?? "").trim();
    if (!address) {
      return { stage: "idle", error: "Enter your home address." };
    }
    const normalized = normalizeAddress(address);

    const { data: lots } = await supabase
      .from("lots")
      .select("id, address, owner_email");

    const match = (lots ?? []).find(
      (l) => normalizeAddress(l.address) === normalized,
    );

    if (match) {
      if (match.owner_email) {
        return {
          stage: "matched",
          address: match.address,
          emailHint: emailHint(match.owner_email),
        };
      }
      return { stage: "matched_no_email", address: match.address };
    }

    // No address match. Decide which branch by whether a board already exists.
    const { count: boardCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "board");
    if ((boardCount ?? 0) === 0) {
      return { stage: "no_match_bootstrap", address };
    }
    return { stage: "no_match_locked", address };
  }

  if (intent === "confirm_member") {
    const address = String(formData.get("address") ?? "").trim();
    const emailParsed = emailSchema.safeParse(formData.get("email"));
    if (!emailParsed.success) {
      return {
        stage: "matched",
        address,
        emailHint: "•••",
      };
    }
    const email = emailParsed.data.toLowerCase();
    const normalized = normalizeAddress(address);

    const { data: lots } = await supabase
      .from("lots")
      .select("id, address, owner_email");
    const lot = (lots ?? []).find(
      (l) => normalizeAddress(l.address) === normalized,
    );

    if (!lot || !lot.owner_email) {
      return { stage: "idle", error: "We could not verify that address." };
    }
    if (lot.owner_email.toLowerCase() !== email) {
      return {
        stage: "matched",
        address: lot.address,
        emailHint: emailHint(lot.owner_email),
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      return { stage: "idle", error: error.message };
    }
    return { stage: "sent", email, role: "member" };
  }

  if (intent === "onboard_president") {
    const address = String(formData.get("address") ?? "").trim();
    const attest = formData.get("attest") === "on";
    const emailParsed = emailSchema.safeParse(formData.get("email"));

    if (!attest || !emailParsed.success) {
      return {
        stage: "no_match_bootstrap",
        address,
      };
    }

    // Re-check that no board exists. Closes the (tiny) race where two people
    // hit the bootstrap path simultaneously.
    const { count: boardCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "board");
    if ((boardCount ?? 0) > 0) {
      return { stage: "no_match_locked", address };
    }

    const email = emailParsed.data.toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      return { stage: "no_match_bootstrap", address };
    }
    return { stage: "sent", email, role: "board" };
  }

  return { stage: "idle" };
}
