import "server-only";

export type GeoPoint = { lon: number; lat: number; matched: string };

// US Census Geocoder — free, no API key, US-only. Used only to center the
// map on the board member's neighborhood (returns a point, no parcels).
export async function geocodeAddress(
  address: string,
): Promise<GeoPoint | null> {
  const url = new URL(
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
  );
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match?.coordinates) return null;
  return {
    lon: Number(match.coordinates.x),
    lat: Number(match.coordinates.y),
    matched: String(match.matchedAddress ?? address),
  };
}
