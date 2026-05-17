import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ q?: string; imported?: string }>;

export default async function LotsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, imported } = await searchParams;
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();

  let lotsQuery = supabase
    .from("lots")
    .select(
      "id, lot_number, address, owner_name, owner_email, dues_payments(status, year)",
    )
    .order("lot_number");

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`;
    lotsQuery = lotsQuery.or(
      `lot_number.ilike.${term},address.ilike.${term},owner_name.ilike.${term}`,
    );
  }

  const { data: lots, error } = await lotsQuery;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lots</h1>
          <p className="text-sm text-slate-600">
            {lots?.length ?? 0} lot{lots?.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/lots/map"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            From map
          </Link>
          <Link
            href="/lots/import"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Import CSV
          </Link>
          <Link
            href="/lots/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Add lot
          </Link>
        </div>
      </header>

      {imported && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Imported {imported} lot{imported === "1" ? "" : "s"} from CSV.
        </div>
      )}

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by lot number, address, or owner"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Search
        </button>
        {q && (
          <Link
            href="/lots"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Clear
          </Link>
        )}
      </form>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Lot</th>
              <th className="px-4 py-2 font-medium">Address</th>
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">
                {currentYear} dues
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lots?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  {q
                    ? `No lots match "${q}".`
                    : "No lots yet. Add your first lot to get started."}
                </td>
              </tr>
            )}
            {lots?.map((lot) => {
              const dues = (lot.dues_payments as { status: string; year: number }[] | null)?.find(
                (d) => d.year === currentYear,
              );
              return (
                <tr key={lot.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {lot.lot_number}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{lot.address}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {lot.owner_name || (
                      <span className="text-slate-400">unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {lot.owner_email || (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {dues ? (
                      <StatusBadge status={dues.status} />
                    ) : (
                      <span className="text-xs text-slate-400">no record</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/lots/${lot.id}`}
                      className="text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    partial: "bg-amber-100 text-amber-800 ring-amber-200",
    unpaid: "bg-rose-100 text-rose-800 ring-rose-200",
    waived: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  const cls = styles[status] ?? styles.unpaid;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  );
}
