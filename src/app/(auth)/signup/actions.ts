"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SignupState =
  | { stage: "idle"; error?: string }
  // Lot matches and has an owner_email on file. We don't reveal the email —
  // user must enter it and we match server-side.
  | { stage: "matched"; address: string; emailHint: string; error?: string }
  // Lot matches but the board hasn't set owner_email yet. Self-signup blocked.
  | { stage: "matched_no_email"; address: string }
  // No address match AND no board exists yet → "are you the president?" path.
  | { stage: "no_match_bootstrap"; address: string; error?: string }
  // No address match but a board already runs this HOA → dead-end.
  | { stage: "no_match_locked"; address: string }
  | { stage: "sent"; email: string; role: "member" | "board" };

const emailSchema = z.email("Enter a valid email.");

type LookupRow = {
  result:
    | "matched"
    | "matched_no_email"
    | "no_match_bootstrap"
    | "no_match_locked";
  lot_address: string | null;
  email_hint: string | null;
};

// Autocomplete for the address field. Returns lot addresses only (no owner
// data) via a SECURITY DEFINER function, since /signup is unauthenticated and
// RLS blocks direct reads of public.lots.
export async function searchAddresses(
  query: string,
): Promise<{ id: string; address: string }[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_lot_addresses", {
    p_query: q,
  });
  return (data ?? []) as { id: string; address: string }[];
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

    const { data, error } = await supabase.rpc("signup_address_lookup", {
      p_address: address,
    });
    if (error) {
      return { stage: "idle", error: error.message };
    }
    const row = (data?.[0] ?? null) as LookupRow | null;
    if (!row) {
      return { stage: "idle", error: "Could not check that address." };
    }

    switch (row.result) {
      case "matched":
        return {
          stage: "matched",
          address: row.lot_address ?? address,
          emailHint: row.email_hint ?? "•••",
        };
      case "matched_no_email":
        return { stage: "matched_no_email", address: row.lot_address ?? address };
      case "no_match_locked":
        return { stage: "no_match_locked", address };
      default:
        return { stage: "no_match_bootstrap", address };
    }
  }

  if (intent === "confirm_member") {
    const address = String(formData.get("address") ?? "").trim();
    const emailParsed = emailSchema.safeParse(formData.get("email"));
    if (!emailParsed.success) {
      return {
        stage: "matched",
        address,
        emailHint: "•••",
        error: "Enter a valid email address.",
      };
    }
    const email = emailParsed.data.toLowerCase();

    const { data: ok, error: verifyErr } = await supabase.rpc(
      "verify_lot_email",
      { p_address: address, p_email: email },
    );
    if (verifyErr) {
      return { stage: "idle", error: verifyErr.message };
    }
    if (!ok) {
      return {
        stage: "matched",
        address,
        emailHint: "•••",
        error:
          "That email doesn't match the one on file for this address. Check with your board if you think this is wrong.",
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

    if (!emailParsed.success) {
      return {
        stage: "no_match_bootstrap",
        address,
        error: "Enter a valid email address.",
      };
    }
    if (!attest) {
      return {
        stage: "no_match_bootstrap",
        address,
        error: "Please confirm you're authorized to set up this HOA.",
      };
    }

    // Re-check via the same lookup: if a board now exists (or the address
    // actually matches a lot) this returns something other than the
    // bootstrap branch. Closes the race where two people hit /signup
    // simultaneously on a fresh install.
    const { data } = await supabase.rpc("signup_address_lookup", {
      p_address: address,
    });
    const row = (data?.[0] ?? null) as LookupRow | null;
    if (row && row.result !== "no_match_bootstrap") {
      return { stage: "no_match_locked", address };
    }

    const email = emailParsed.data.toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      return { stage: "no_match_bootstrap", address, error: error.message };
    }
    return { stage: "sent", email, role: "board" };
  }

  return { stage: "idle" };
}
