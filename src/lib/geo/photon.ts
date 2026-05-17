import "server-only";

export type AddressSuggestion = {
  id: string;
  label: string;
  lon: number;
  lat: number;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number | string;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
};

function label(p: PhotonFeature["properties"]): string {
  const line1 = [
    [p.housenumber, p.street].filter(Boolean).join(" ") || p.name,
  ]
    .filter(Boolean)
    .join("");
  const line2 = [p.city, p.state, p.postcode].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(", ");
}

// Photon (photon.komoot.io) — free, no API key, OSM-based, real
// autocomplete. Used only to pick a point to center the map on.
export async function searchAddressSuggestions(
  query: string,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  const out: AddressSuggestion[] = [];
  for (const f of (data?.features ?? []) as PhotonFeature[]) {
    if (f?.properties?.countrycode && f.properties.countrycode !== "US") {
      continue;
    }
    const c = f?.geometry?.coordinates;
    if (!c) continue;
    const text = label(f.properties);
    if (!text) continue;
    out.push({
      id: String(f.properties.osm_id ?? `${c[0]},${c[1]}`),
      label: text,
      lon: Number(c[0]),
      lat: Number(c[1]),
    });
  }
  return out;
}
