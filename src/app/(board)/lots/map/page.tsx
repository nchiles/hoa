import Link from "next/link";
import { requireBoard } from "@/lib/auth/requireRole";
import { MapSelect } from "./MapSelect";

type SearchParams = Promise<{ error?: string }>;

export default async function MapImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireBoard();
  const params = await searchParams;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Add lots from a map
          </h1>
          <p className="text-sm text-slate-600">
            Enter an address in your neighborhood, then click the lots that
            belong to your HOA.
          </p>
        </div>
        <Link
          href="/lots"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to lots
        </Link>
      </header>

      {params.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {params.error}
        </div>
      )}

      <MapSelect />
    </main>
  );
}
