"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createLotsFromParcels,
  lookupNeighborhood,
  type MapState,
} from "./actions";

const initial: MapState = { stage: "idle" };

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

export function MapSelect() {
  const [state, formAction, isPending] = useActionState(
    lookupNeighborhood,
    initial,
  );

  if (state.stage !== "loaded") {
    return (
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="address" className="text-sm font-medium text-slate-700">
          An address in the neighborhood
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
          Prototype covers Kent County, MI only.
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
            {isPending ? "Loading…" : "Show neighborhood"}
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
  // ppn -> site address, for the rows we'll create.
  const [selected, setSelected] = useState<Record<string, string>>({});
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [state.center.lon, state.center.lat],
      zoom: 17,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("parcels", {
        type: "geojson",
        data: state.parcels as unknown as GeoJSON.FeatureCollection,
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
    });

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
        Showing parcels near <strong>{state.matched}</strong>. Click the lots
        that belong to your HOA, then add them.
      </div>
      <div
        ref={containerRef}
        className="h-[60vh] w-full overflow-hidden rounded-lg border border-slate-200"
      />
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
