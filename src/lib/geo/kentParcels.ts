import "server-only";

const KENT_PARCEL_QUERY =
  "https://gis.kentcountymi.gov/agisprod/rest/services/ParcelsWithCondos/MapServer/0/query";

export type ParcelFeature = {
  type: "Feature";
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
  properties: {
    PPN?: number | string;
    PROPERTYADDRESS?: string;
    PROPADDRESSCITY?: string;
    OWNERNAME1?: string;
  };
};

export type ParcelCollection = {
  type: "FeatureCollection";
  features: ParcelFeature[];
};

// Parcels within `radiusMeters` of a lon/lat. Kent County, MI only —
// outside the county this returns an empty collection (no error).
export async function fetchParcelsNear(
  lon: number,
  lat: number,
  radiusMeters = 350,
): Promise<ParcelCollection | null> {
  const url = new URL(KENT_PARCEL_QUERY);
  url.searchParams.set("geometry", JSON.stringify({ x: lon, y: lat }));
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("distance", String(radiusMeters));
  url.searchParams.set("units", "esriSRUnit_Meter");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set(
    "outFields",
    "PPN,PROPERTYADDRESS,PROPADDRESSCITY,OWNERNAME1",
  );
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("f", "geojson");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as ParcelCollection;
  if (!data?.features) return { type: "FeatureCollection", features: [] };
  return data;
}

// Address typeahead, sourced from the parcel dataset itself so every
// suggestion is a real, mappable parcel. Kent County, MI only.
export async function searchParcelAddresses(
  query: string,
): Promise<{ ppn: string; address: string }[]> {
  const q = query.trim().toUpperCase().replace(/'/g, "''");
  if (q.length < 3) return [];
  const url = new URL(KENT_PARCEL_QUERY);
  url.searchParams.set("where", `PROPERTYADDRESS LIKE '${q}%'`);
  url.searchParams.set("outFields", "PPN,PROPERTYADDRESS");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("orderByFields", "PROPERTYADDRESS");
  url.searchParams.set("resultRecordCount", "8");
  url.searchParams.set("f", "json");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  const seen = new Set<string>();
  const out: { ppn: string; address: string }[] = [];
  for (const f of data?.features ?? []) {
    const a = String(f?.attributes?.PROPERTYADDRESS ?? "").trim();
    if (!a || seen.has(a)) continue;
    seen.add(a);
    out.push({ ppn: String(f?.attributes?.PPN ?? a), address: a });
  }
  return out;
}

// One parcel by exact site address, with geometry, plus a representative
// interior-ish point (mean of the first ring) to center/seed the map.
export async function parcelCenterByAddress(
  address: string,
): Promise<{ lon: number; lat: number } | null> {
  const a = address.trim().toUpperCase().replace(/'/g, "''");
  if (!a) return null;
  const url = new URL(KENT_PARCEL_QUERY);
  url.searchParams.set("where", `PROPERTYADDRESS = '${a}'`);
  url.searchParams.set("outFields", "PPN");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("resultRecordCount", "1");
  url.searchParams.set("f", "geojson");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as ParcelCollection;
  const geom = data?.features?.[0]?.geometry as
    | { type: string; coordinates: number[][][] | number[][][][] }
    | undefined;
  if (!geom) return null;
  const ring =
    geom.type === "MultiPolygon"
      ? (geom.coordinates as number[][][][])[0]?.[0]
      : (geom.coordinates as number[][][])[0];
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return { lon: sx / ring.length, lat: sy / ring.length };
}

// "1234 MEADOW LN" → { street_number: "1234", street_name: "Meadow Ln" }.
// Same first-token heuristic as the structured-address backfill.
export function splitParcelAddress(raw: string | undefined): {
  street_number: string;
  street_name: string;
} | null {
  const s = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!s) return null;
  const sp = s.indexOf(" ");
  if (sp === -1) return { street_number: "", street_name: titleCase(s) };
  return {
    street_number: s.slice(0, sp),
    street_name: titleCase(s.slice(sp + 1)),
  };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
