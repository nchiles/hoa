"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createLotsFromParcels,
  lookupNeighborhood,
  parcelsInView,
  type MapState,
} from "./actions";

const initial: MapState = { stage: "idle" };

// Below this zoom a viewport query would pull too many parcels to be
// useful (and the service caps at 1000). Prompt the user to zoom in.
const MIN_PARCEL_ZOOM = 16;

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const EMPTY: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function MapSelect() {
  const [state, formAction, isPending] = useActionState(
    lookupNeighborhood,
    initial,
  );

  if (state.stage !== "loaded") {
    return (
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="address" className="text-sm font-medium text-slate-700">
          An address in your neighborhood
        </label>
        <input
          id="address"
          name="address"
          type="text"
          required
          placeholder="123 Main St, Grand Rapids, MI"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-slate-500">
          Just used to center the map — you&rsquo;ll pick the actual lots on
          the map next. Prototype covers Kent County, MI only.
        </p>
        {state.error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {state.error}
          </div>
        )}
        <div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending ? "Locating…" : "Open the map"}
          </button>
        </div>
      </form>
    );
  }

  return <ParcelMap state={state} />;
}

function ParcelMap({
  state,
}: {
  state: Extract<MapState, { stage: "loaded" }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [zoomedOut, setZoomedOut] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [state.center.lon, state.center.lat],
      zoom: 17,
    });
    mapRef.current = map;

    let timer: ReturnType<typeof setTimeout> | null = null;

    function reapplySelection() {
      for (const ppn of Object.keys(selectedRef.current)) {
        try {
          map.setFeatureState(
            { source: "parcels", id: ppn },
            { selected: true },
          );
        } catch {
          /* feature not in current viewport — fine */
        }
      }
    }

    async function loadViewport() {
      if (map.getZoom() < MIN_PARCEL_ZOOM) {
        setZoomedOut(true);
        (map.getSource("parcels") as maplibregl.GeoJSONSource)?.setData(
          EMPTY,
        );
        return;
      }
      setZoomedOut(false);
      setLoading(true);
      const b = map.getBounds();
      try {
        const fc = await parcelsInView(
          b.getWest(),
          b.getSouth(),
          b.getEast(),
          b.getNorth(),
        );
        (map.getSource("parcels") as maplibregl.GeoJSONSource)?.setData(
          fc as unknown as GeoJSON.FeatureCollection,
        );
        reapplySelection();
      } finally {
        setLoading(false);
      }
    }

    function scheduleLoad() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(loadViewport, 300);
    }

    map.on("load", () => {
      map.addSource("parcels", {
        type: "geojson",
        data: EMPTY,
        promoteId: "PPN",
      });
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#0f766e",
            "#64748b",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.55,
            0.2,
          ],
        },
      });
      map.addLayer({
        id: "parcels-line",
        type: "line",
        source: "parcels",
        paint: { "line-color": "#334155", "line-width": 1 },
      });
      loadViewport();
    });

    map.on("moveend", scheduleLoad);

    map.on("click", "parcels-fill", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const ppn = String(f.id ?? f.properties?.PPN ?? "");
      if (!ppn) return;
      const addr = String(f.properties?.PROPERTYADDRESS ?? "").trim();
      const next = { ...selectedRef.current };
      let on: boolean;
      if (next[ppn] !== undefined) {
        delete next[ppn];
        on = false;
      } else {
        next[ppn] = addr;
        on = true;
      }
      map.setFeatureState({ source: "parcels", id: ppn }, { selected: on });
      setSelected(next);
    });

    map.on("mouseenter", "parcels-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "parcels-fill", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      if (timer) clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [state]);

  const count = Object.keys(selected).length;
  const payload = JSON.stringify(
    Object.entries(selected).map(([ppn, address]) => ({ ppn, address })),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
        Centered on <strong>{state.matched}</strong>. Pan/zoom to your
        neighborhood and click the lots that belong to your HOA.
      </div>
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[60vh] w-full overflow-hidden rounded-lg border border-slate-200"
        />
        {zoomedOut && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white">
            Zoom in to load parcels
          </div>
        )}
        {loading && !zoomedOut && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow">
            Loading parcels…
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {count} parcel{count === 1 ? "" : "s"} selected
        </p>
        <form action={createLotsFromParcels}>
          <input type="hidden" name="selected" value={payload} />
          <button
            type="submit"
            disabled={count === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Add selected lots
          </button>
        </form>
      </div>
    </div>
  );
}
