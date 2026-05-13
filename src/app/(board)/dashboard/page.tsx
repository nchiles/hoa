import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();
  const [{ count: lotCount }, { data: dues }] = await Promise.all([
    supabase.from("lots").select("id", { count: "exact", head: true }),
    supabase
      .from("dues_payments")
      .select("status")
      .eq("year", currentYear),
  ]);

  const totalDues = dues?.length ?? 0;
  const paidCount = dues?.filter((d) => d.status === "paid").length ?? 0;
  const unpaidCount =
    dues?.filter((d) => d.status === "unpaid").length ?? 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Board dashboard
        </h1>
        <p className="text-sm text-slate-600">
          Phase 1 view. Charts, expenditure tracker, and the neighborhood map
          arrive in Phase 2.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Lots" value={String(lotCount ?? 0)} />
        <Stat
          label={`Dues records (${currentYear})`}
          value={String(totalDues)}
        />
        <Stat
          label={`Paid (${currentYear})`}
          value={`${paidCount} / ${totalDues || "—"}`}
        />
        <Stat label={`Unpaid (${currentYear})`} value={String(unpaidCount)} />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
