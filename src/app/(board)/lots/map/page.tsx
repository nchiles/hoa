import Link from "next/link";
import { requireBoard } from "@/lib/auth/requireRole";
import { MapView, type LotFeature } from "./MapView";

export default async function LotsMapPage() {
  const { supabase } = await requireBoard();
  const currentYear = new Date().getFullYear();

  const { data: lots } = await supabase
    .from("lots")
    .select(
      "id, lot_number, street_number, address, geometry_geojson, dues_payments(status, year)",
    )
    .not("geometry_geojson", "is", null);

  const features: LotFeature[] = (lots ?? [])
    .filter((l) => l.geometry_geojson)
    .map((l) => {
      const dues = (
        l.dues_payments as { status: string; year: number }[] | null
      )?.find((d) => d.year === currentYear);
      return {
        type: "Feature",
        id: l.id as string,
        geometry: l.geometry_geojson as GeoJSON.Geometry,
        properties: {
          id: l.id as string,
          label: String(l.street_number ?? l.lot_number ?? ""),
          address: String(l.address ?? ""),
          status: dues?.status ?? "none",
        },
      };
    });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Neighborhood map
          </h1>
          <p className="text-sm text-slate-600">
            {features.length} lot{features.length === 1 ? "" : "s"}. Click a
            lot to open it.
          </p>
        </div>
        <Link
          href="/lots"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          List view
        </Link>
      </header>

      {features.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          No lot boundaries loaded yet.
        </div>
      ) : (
        <MapView features={features} />
      )}
    </main>
  );
}
