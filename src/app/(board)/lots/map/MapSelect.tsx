"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createLotsFromParcels,
  lookupNeighborhood,
  parcelsInView,
  searchAddresses,
  type MapState,
} from "./actions";

const initial: MapState = { stage: "idle" };

// Below this zoom a viewport query pulls too many parcels to be useful
// (the service also caps at 1000). Prompt the user to zoom in.
const MIN_PARCEL_ZOOM = 15;

// CARTO Positron — free, no key, light/low-clutter (far cleaner than the
// default OSM raster, which was the "too much clutter" complaint).
const BASEMAP: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap, © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
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
        <AddressAutocomplete error={state.error} pending={isPending} />
      </form>
    );
  }

  return <ParcelMap state={state} />;
}

function AddressAutocomplete({
  error,
  pending,
}: {
  error?: string;
  pending: boolean;
}) {
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<{
    label: string;
    lon: string;
    lat: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<
    { id: string; label: string; lon: number; lat: number }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (picked) return;
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchAddresses(q);
      setSuggestions(r);
      setOpen(true);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [value, picked]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="flex flex-col gap-1" ref={boxRef}>
      <label htmlFor="address" className="text-sm font-medium text-slate-700">
        An address in your neighborhood
      </label>
      <div className="relative">
        <input
          id="address"
          type="text"
          required
          autoComplete="off"
          value={value}
          placeholder="Start typing an address…"
          onChange={(e) => {
            setValue(e.target.value);
            setPicked(null);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setValue(s.label);
                    setPicked({
                      label: s.label,
                      lon: String(s.lon),
                      lat: String(s.lat),
                    });
                    setOpen(false);
                    setSuggestions([]);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input type="hidden" name="label" value={picked?.label ?? ""} />
      <input type="hidden" name="lon" value={picked?.lon ?? ""} />
      <input type="hidden" name="lat" value={picked?.lat ?? ""} />

      {picked ? (
        <p className="text-xs font-medium text-emerald-700">
          ✓ {picked.label}
        </p>
      ) : loading ? (
        <p className="text-xs text-slate-400">Searching…</p>
      ) : (
        <p className="text-xs text-slate-500">
          Pick an address from the list. Parcel data covers Kent County, MI.
        </p>
      )}

      {error && (
        <div className="mt-1 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div className="mt-2">
        <button
          type="submit"
          disabled={pending || !picked}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Opening…" : "Open the map"}
        </button>
      </div>
    </div>
  );
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
      style: BASEMAP,
      center: [state.center.lon, state.center.lat],
      zoom: 17,
    });
    mapRef.current = map;
    let hovered: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function reapplySelection() {
      for (const ppn of Object.keys(selectedRef.current)) {
        try {
          map.setFeatureState(
            { source: "parcels", id: ppn },
            { selected: true },
          );
        } catch {
          /* not in current viewport */
        }
      }
    }

    async function loadViewport() {
      if (map.getZoom() < MIN_PARCEL_ZOOM) {
        setZoomedOut(true);
        (map.getSource("parcels") as maplibregl.GeoJSONSource)?.setData(EMPTY);
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
            "#0d9488",
            ["boolean", ["feature-state", "hover"], false],
            "#5eead4",
            "#93c5fd",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.6,
            0.3,
          ],
        },
      });
      map.addLayer({
        id: "parcels-line",
        type: "line",
        source: "parcels",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#0f766e",
            "#2563eb",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.5,
            1,
          ],
        },
      });
      map.addLayer({
        id: "parcels-label",
        type: "symbol",
        source: "parcels",
        minzoom: 17,
        layout: {
          "text-field": ["get", "PROPERTYADDRESS"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#334155",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
      loadViewport();
    });

    map.on("moveend", scheduleLoad);

    map.on("mousemove", "parcels-fill", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = String(f.id ?? "");
      if (hovered && hovered !== id) {
        map.setFeatureState(
          { source: "parcels", id: hovered },
          { hover: false },
        );
      }
      hovered = id;
      map.setFeatureState({ source: "parcels", id }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "parcels-fill", () => {
      if (hovered) {
        map.setFeatureState(
          { source: "parcels", id: hovered },
          { hover: false },
        );
      }
      hovered = null;
      map.getCanvas().style.cursor = "";
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
      <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        Centered on <strong>{state.matched}</strong>. Blue outlines are
        parcels — hover to highlight, click to select. Selected lots turn
        teal.
      </div>
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[62vh] w-full overflow-hidden rounded-lg border border-slate-200"
        />
        {zoomedOut && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-slate-900/85 px-3 py-1.5 text-xs font-medium text-white">
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
