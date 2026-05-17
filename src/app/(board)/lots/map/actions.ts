"use server";

import { redirect } from "next/navigation";
import { requireBoard } from "@/lib/auth/requireRole";
import {
  fetchParcelsNear,
  parcelCenterByAddress,
  searchParcelAddresses,
  splitParcelAddress,
  type ParcelCollection,
} from "@/lib/geo/kentParcels";

export async function searchAddresses(
  query: string,
): Promise<{ ppn: string; address: string }[]> {
  await requireBoard();
  return searchParcelAddresses(query);
}

export type MapState =
  | { stage: "idle"; error?: string }
  | {
      stage: "loaded";
      center: { lon: number; lat: number };
      matched: string;
      parcels: ParcelCollection;
    };

export async function lookupNeighborhood(
  _prev: MapState,
  formData: FormData,
): Promise<MapState> {
  await requireBoard();
  const address = String(formData.get("address") ?? "").trim();
  if (!address) {
    return { stage: "idle", error: "Pick an address from the list." };
  }

  const point = await parcelCenterByAddress(address);
  if (!point) {
    return {
      stage: "idle",
      error:
        "Couldn't locate that address. Pick one from the suggestions list.",
    };
  }

  const parcels = await fetchParcelsNear(point.lon, point.lat);
  if (!parcels) {
    return {
      stage: "idle",
      error: "Parcel service is unavailable right now. Try again shortly.",
    };
  }
  if (parcels.features.length === 0) {
    return {
      stage: "idle",
      error:
        "No parcels found here. This prototype only covers Kent County, MI.",
    };
  }

  return {
    stage: "loaded",
    center: { lon: point.lon, lat: point.lat },
    matched: address,
    parcels,
  };
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
