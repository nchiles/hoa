# Map-Select Lot Import — Prototype

> Single-HOA proof of concept for the click-to-select-lots onboarding UX.
> Validates the interaction before any multi-tenant / paid-data commitment.
> See memory `project_direction.md` for why this is deliberately scoped.

## Goal

A board member opens a map of a neighborhood, clicks the parcels that
belong to their HOA, and those become lot records — replacing/augmenting
CSV import. This prototype proves the UX works end to end using **free**
Kent County, MI parcel data only.

## Explicit limitations (acceptable for a prototype)

- **Kent County, MI only.** Parcels come from Kent County's free ArcGIS
  service. An address outside Kent County returns no parcels — surfaced
  as a clear message, not an error. National coverage = a paid aggregator,
  a separate later decision.
- Single-HOA. Created lots attach to the one existing HOA, like CSV import.
- Additive: `/lots/map` is a new board-only tool. CSV import and the
  manual lot form stay exactly as they are.

## Data flow

1. **Geocode** the entered address → lon/lat. US Census Geocoder
   (`geocoding.geo.census.gov`, free, no key, US-only).
2. **Fetch parcels** near that point from Kent County:
   `…/ParcelsWithCondos/MapServer/0/query` with a buffered point
   (`geometry`, `distance`, `units=esriSRUnit_Meter`,
   `geometryType=esriGeometryPoint`, `inSR=4326`, `outSR=4326`,
   `f=geojson`, `outFields=PPN,PROPERTYADDRESS,PROPADDRESSCITY,OWNERNAME1`).
   Layer 0 is polygons; maxRecordCount 1000 (a neighborhood is far under).
3. **Render** with MapLibre GL JS + OSM raster tiles (no key). Parcel
   polygons overlaid; click toggles selection; running count shown.
4. **Create lots** from the selected parcels. `PROPERTYADDRESS` → split
   first token = `street_number`, remainder = `street_name` (same
   heuristic as the structured-address backfill). Dedupe against existing
   lots by normalized address; skip the generated `address` column.

## Key fields (Kent County layer 0)

`PPN` (parcel id), `PROPERTYADDRESS` (site address string),
`PROPADDRESSCITY`, `OWNERNAME1`. Spatial ref native = NAD83 StatePlane MI
South; always request `outSR=4326`.

## Components

- `src/lib/geo/geocode.ts` — Census geocoder wrapper (server-only).
- `src/lib/geo/kentParcels.ts` — Kent County parcel query (server-only).
- `src/app/(board)/lots/map/page.tsx` — board route shell.
- `src/app/(board)/lots/map/MapSelect.tsx` — client: MapLibre + select.
- `src/app/(board)/lots/map/actions.ts` — geocode, fetch, bulk-create.
- dep: `maplibre-gl`.

## Out of scope (do not build here)

Multi-tenant orgs, org-scoped RLS, billing, national parcel vendor,
non-Kent counties, parcel→existing-lot reconciliation beyond address
dedupe. These belong to the separate multi-tenant initiative.

## Validation

Enter a Grand Rapids / Kent County address → neighborhood parcels render →
click several → "Add N lots" → they appear in `/lots` with correct
street number/name → re-running skips duplicates.
