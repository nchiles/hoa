"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SignupState =
  | { stage: "idle"; error?: string }
  // Address matched a lot. The user can claim it; the request goes to the
  // board for approval regardless of whether the lot is already linked.
  | { stage: "claimable"; address: string; hoaName: string; error?: string }
  // No lot matched. canBootstrap = no board exists yet (founding path open).
  | { stage: "no_match"; address: string; canBootstrap: boolean; error?: string }
  // Dead-end: their lot isn't in the system and they're not bootstrapping.
  // The UI offers share-the-app actions.
  | { stage: "share"; address: string }
  | { stage: "sent"; email: string; kind: "pending" | "board" };

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

export async function searchAddresses(
  query: string,
): Promise<{ id: string; address: string }[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_lot_addresses", { p_query: q });
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

    if (row.result === "matched" || row.result === "matched_no_email") {
      const { data: hoaName } = await supabase.rpc("public_hoa_name");
      return {
        stage: "claimable",
        address: row.lot_address ?? address,
        hoaName: (hoaName as string | null) ?? "this",
      };
    }
    return {
      stage: "no_match",
      address,
      canBootstrap: row.result === "no_match_bootstrap",
    };
  }

  if (intent === "claim_lot") {
    const address = String(formData.get("address") ?? "").trim();
    const emailParsed = emailSchema.safeParse(formData.get("email"));
    if (!emailParsed.success) {
      const { data: hoaName } = await supabase.rpc("public_hoa_name");
      return {
        stage: "claimable",
        address,
        hoaName: (hoaName as string | null) ?? "this",
        error: "Enter a valid email address.",
      };
    }
    const email = emailParsed.data.toLowerCase();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
        // Resolved server-side by handle_new_user(); only set after a
        // confirmed address match. The board still approves every claim.
        data: { signup_kind: "claim", lot_address: address },
      },
    });
    if (error) {
      const { data: hoaName } = await supabase.rpc("public_hoa_name");
      return {
        stage: "claimable",
        address,
        hoaName: (hoaName as string | null) ?? "this",
        error: error.message,
      };
    }
    return { stage: "sent", email, kind: "pending" };
  }

  if (intent === "onboard_president") {
    const address = String(formData.get("address") ?? "").trim();
    const attest = formData.get("attest") === "on";
    const emailParsed = emailSchema.safeParse(formData.get("email"));

    if (!emailParsed.success) {
      return {
        stage: "no_match",
        address,
        canBootstrap: true,
        error: "Enter a valid email address.",
      };
    }
    if (!attest) {
      return {
        stage: "no_match",
        address,
        canBootstrap: true,
        error: "Please confirm you're authorized to set up this HOA.",
      };
    }

    // Re-check: if a board now exists this is no longer a bootstrap.
    const { data } = await supabase.rpc("signup_address_lookup", {
      p_address: address,
    });
    const row = (data?.[0] ?? null) as LookupRow | null;
    if (row && row.result !== "no_match_bootstrap") {
      return { stage: "share", address };
    }

    const email = emailParsed.data.toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      return {
        stage: "no_match",
        address,
        canBootstrap: true,
        error: error.message,
      };
    }
    return { stage: "sent", email, kind: "board" };
  }

  return { stage: "idle" };
}
