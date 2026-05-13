import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ offboarded?: string }>;

export default async function LotDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { offboarded } = await searchParams;
  const supabase = await createClient();

  const [{ data: lot }, { data: dues }] = await Promise.all([
    supabase
      .from("lots")
      .select(
        "id, lot_number, address, owner_name, owner_email, owner_phone, notes, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("dues_payments")
      .select(
        "year, amount_due, amount_paid, paid_date, method, status, notes, stripe_payment_id",
      )
      .eq("lot_id", id)
      .order("year", { ascending: false }),
  ]);

  if (!lot) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <Link
        href="/lots"
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← All lots
      </Link>

      {offboarded && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Lot offboarded. Owner PII has been cleared; payment history remains.
        </div>
      )}

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Lot {lot.lot_number}
          </h1>
          <p className="text-sm text-slate-600">{lot.address}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/lots/${lot.id}/edit`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </Link>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Owner
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Name" value={lot.owner_name} />
          <Row label="Email" value={lot.owner_email} />
          <Row label="Phone" value={lot.owner_phone} />
        </dl>
        {lot.owner_email && (
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <Link
              href={`/admin/invite?email=${encodeURIComponent(lot.owner_email)}`}
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Send / resend invite →
            </Link>
          </div>
        )}
        {lot.notes && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Board notes
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {lot.notes}
            </dd>
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Dues history
          </h2>
          <span className="text-xs text-slate-500">
            {dues?.length ?? 0} record{dues?.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {!dues || dues.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No dues records yet. Dues entry UI lands in Phase 2.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Year</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Paid</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dues.map((d) => (
                  <tr key={d.year}>
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {d.year}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-2 tabular-nums text-slate-700">
                      ${money(d.amount_paid)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-slate-700">
                      ${money(d.amount_due)}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {d.paid_date ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {d.method ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Created {new Date(lot.created_at).toLocaleDateString()} · Updated{" "}
        {new Date(lot.updated_at).toLocaleDateString()}
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
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

function money(n: number | string | null): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return v.toFixed(2);
}
