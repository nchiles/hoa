"use server";

import { redirect } from "next/navigation";
import { requireBoard } from "@/lib/auth/requireRole";
import {
  searchAddressSuggestions,
  type AddressSuggestion,
} from "@/lib/geo/photon";
import {
  fetchParcelsInBbox,
  splitParcelAddress,
  type ParcelCollection,
} from "@/lib/geo/kentParcels";

export type MapState =
  | { stage: "idle"; error?: string }
  | {
      stage: "loaded";
      center: { lon: number; lat: number };
      matched: string;
    };

// Address autocomplete for the map-centering field (geocoder, not parcels).
export async function searchAddresses(
  query: string,
): Promise<AddressSuggestion[]> {
  await requireBoard();
  return searchAddressSuggestions(query);
}

// The picked suggestion already carries coordinates — just open the map.
export async function lookupNeighborhood(
  _prev: MapState,
  formData: FormData,
): Promise<MapState> {
  await requireBoard();
  const matched = String(formData.get("label") ?? "").trim();
  const lon = Number(formData.get("lon"));
  const lat = Number(formData.get("lat"));
  if (!matched || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    return { stage: "idle", error: "Pick an address from the list." };
  }
  return { stage: "loaded", center: { lon, lat }, matched };
}

// Parcels for the current map viewport. Called as the user pans/zooms.
export async function parcelsInView(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
): Promise<ParcelCollection> {
  await requireBoard();
  const data = await fetchParcelsInBbox(minLon, minLat, maxLon, maxLat);
  return data ?? { type: "FeatureCollection", features: [] };
}

const normAddr = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");

export async function createLotsFromParcels(formData: FormData) {
  const { supabase } = await requireBoard();

  const payload = formData.get("selected");
  if (typeof payload !== "string" || !payload) {
    redirect("/lots/map?error=Nothing+selected");
  }

  let selected: { ppn: string; address: string }[];
  try {
    selected = JSON.parse(payload as string);
  } catch {
    redirect("/lots/map?error=Invalid+selection");
  }
  if (!Array.isArray(selected) || selected.length === 0) {
    redirect("/lots/map?error=Nothing+selected");
  }

  // Dedupe against existing lots by normalized address.
  const { data: existing } = await supabase
    .from("lots")
    .select("address");
  const existingNorm = new Set(
    (existing ?? []).map((l) => normAddr(String(l.address ?? ""))),
  );

  const rows: {
    lot_number: string;
    street_number: string;
    street_name: string;
  }[] = [];
  const seen = new Set<string>();
  for (const s of selected) {
    const parts = splitParcelAddress(s.address);
    if (!parts || !parts.street_name) continue;
    const full = `${parts.street_number} ${parts.street_name}`.trim();
    const key = normAddr(full);
    if (existingNorm.has(key) || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      // Lot number defaults to the parcel id; the board can rename later.
      lot_number: String(s.ppn ?? full),
      street_number: parts.street_number,
      street_name: parts.street_name,
    });
  }

  if (rows.length === 0) {
    redirect("/lots/map?error=All+selected+parcels+already+exist");
  }

  const { error, count } = await supabase
    .from("lots")
    .insert(rows, { count: "exact" });
  if (error) {
    redirect(`/lots/map?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/lots?imported=${count ?? rows.length}`);
}
