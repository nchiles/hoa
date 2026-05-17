# Map Architecture (Regrid)

> Supersedes `docs/MAP_IMPORT_PROTOTYPE.md`. The free/county-parcel
> prototype (PR #13) is abandoned. Polygon source decided: **Regrid**
> (paid national parcels). The map is the core product, not a feature.

## Principle

Regrid is used **only during onboarding/selection**. Selected parcel
geometry is copied into our own database. The everyday resident-facing
map renders from **our DB**, never Regrid — so the hot path is fast,
reliable, and not metered.

```
Board onboarding         Resident / board everyday
─────────────────        ──────────────────────────
Regrid vector tiles  →   our DB (lots.geometry)  →  MapLibre map
+ Regrid Parcel API      (no Regrid on this path)    colored by dues
(click to pick lots)
```

## Data model

`lots` gains:
- `geometry` — the lot polygon. Supabase has PostGIS; use
  `geometry(MultiPolygon, 4326)` with a GIST index. (If PostGIS is not
  enabled, fallback: `jsonb` GeoJSON — but prefer PostGIS for spatial
  queries / future "lots near me".)
- `regrid_id` — Regrid stable parcel id (e.g. `ll_uuid`), for dedupe and
  optional re-sync.
- existing `street_number` / `street_name` still populated from the
  parcel's address fields.

## Regrid integration (two products needed)

1. **Tileserver — vector parcel tiles** (`/api/v1/parcels/{z}/{x}/{y}.mvt`).
   Rendered as a clickable MapLibre layer on the onboarding map. Token is
   required; do not ship it to the browser raw — proxy tile requests
   through a Next.js route handler that injects the token server-side
   (also lets us domain/rate control).
2. **Parcel API v2** — on parcel click, fetch the authoritative full
   polygon + attributes by parcel id (tile geometry is clipped/simplified
   and not suitable to persist). Store geometry + `regrid_id` + address in
   `lots`.

## Build stages (each its own PR)

- **PR A — schema + Regrid plumbing.** Enable PostGIS; add `geometry`,
  `regrid_id` to `lots`; env `REGRID_API_TOKEN`; a tile-proxy route
  handler; a server lib `lib/geo/regrid.ts` (parcel-by-id, parcel-by-point).
  No UI yet. Verified with a scripted fetch.
- **PR B — board onboarding map.** `/lots/map`: MapLibre + Regrid vector
  tiles via the proxy; pan/zoom; click parcel → highlight → on confirm,
  fetch full geometry from Parcel API, create `lots` rows (dedupe by
  `regrid_id`). Replaces the abandoned PR #13 entirely.
- **PR C — resident/board everyday map.** A map that renders the HOA's
  stored `lots.geometry` from our DB, colored by dues status, click →
  lot detail. This is "the app." No Regrid calls.
- **PR D — polish.** Member vs board views, status legend, mobile.

## What the user must procure (blocking PR A)

A Regrid account with a plan that includes **both**:
- **Tileserver / vector tiles** access, and
- **Parcel API v2** access (for full-geometry fetch on selection).

Self-Serve plans exist (app.regrid.com/api/plans); tileserver may be an
add-on or require contacting Regrid sales. Deliverable needed from the
user: a **Regrid API token** with tile + parcel-API scope, and
confirmation of the request/tile quota on the chosen plan. Until that
token exists, PR A cannot be verified end-to-end.

## Open questions to resolve with Regrid

- Tile token model: query-param vs header; can it be domain-locked so a
  proxy is optional? (Plan assumes we proxy regardless.)
- Parcel API: fetch full geometry by the id present in MVT features
  (confirm the id field name in tiles vs API, e.g. `ll_uuid` / `path`).
- Quota/cost of onboarding usage (tiles are panned heavily during a
  draw/select session).
