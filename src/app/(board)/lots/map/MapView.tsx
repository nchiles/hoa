"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export type LotFeature = {
  type: "Feature";
  id: string;
  geometry: GeoJSON.Geometry;
  properties: {
    id: string;
    label: string;
    address: string;
    status: string;
  };
};

const STATUS_COLOR: Record<string, string> = {
  paid: "#16a34a",
  partial: "#d97706",
  unpaid: "#dc2626",
  waived: "#0ea5e9",
  none: "#94a3b8",
};

// No external basemap — polygons are the content and this keeps the map
// fully self-contained (no tile server on the render path).
const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "bg",
      type: "background",
      paint: { "background-color": "#eef2f6" },
    },
  ],
};

function bbox(features: LotFeature[]): [number, number, number, number] {
  let minX = 180,
    minY = 90,
    maxX = -180,
    maxY = -90;
  const walk = (c: unknown): void => {
    if (
      Array.isArray(c) &&
      typeof c[0] === "number" &&
      typeof c[1] === "number"
    ) {
      const [x, y] = c as number[];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else if (Array.isArray(c)) {
      for (const n of c) walk(n);
    }
  };
  for (const f of features) walk((f.geometry as { coordinates: unknown }).coordinates);
  return [minX, minY, maxX, maxY];
}

export function MapView({ features }: { features: LotFeature[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current) return;
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: features as unknown as GeoJSON.Feature[],
    };
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BLANK_STYLE,
      bounds: bbox(features),
      fitBoundsOptions: { padding: 40 },
    });

    map.on("load", () => {
      map.addSource("lots", { type: "geojson", data: fc, promoteId: "id" });
      map.addLayer({
        id: "lots-fill",
        type: "fill",
        source: "lots",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "paid",
            STATUS_COLOR.paid,
            "partial",
            STATUS_COLOR.partial,
            "unpaid",
            STATUS_COLOR.unpaid,
            "waived",
            STATUS_COLOR.waived,
            STATUS_COLOR.none,
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.8,
            0.55,
          ],
        },
      });
      map.addLayer({
        id: "lots-line",
        type: "line",
        source: "lots",
        paint: { "line-color": "#1e293b", "line-width": 1.5 },
      });
      map.addLayer({
        id: "lots-label",
        type: "symbol",
        source: "lots",
        layout: { "text-field": ["get", "label"], "text-size": 11 },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      let hovered: string | null = null;
      map.on("mousemove", "lots-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = String(f.id);
        if (hovered && hovered !== id) {
          map.setFeatureState({ source: "lots", id: hovered }, { hover: false });
        }
        hovered = id;
        map.setFeatureState({ source: "lots", id }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "lots-fill", () => {
        if (hovered) {
          map.setFeatureState({ source: "lots", id: hovered }, { hover: false });
        }
        hovered = null;
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "lots-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) router.push(`/lots/${id}`);
      });
    });

    return () => map.remove();
  }, [features, router]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="h-[70vh] w-full overflow-hidden rounded-lg border border-slate-200"
      />
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        {[
          ["paid", "Paid"],
          ["partial", "Partial"],
          ["unpaid", "Unpaid"],
          ["none", "No record"],
        ].map(([k, lbl]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: STATUS_COLOR[k] }}
            />
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}
