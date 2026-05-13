import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Middleware already redirects non-board users away from /dashboard, but
  // re-check here so RLS isn't the only thing standing between member and
  // board UI in the event of a middleware regression.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "board") redirect("/me");

  // RLS gives board users full read access to lots and dues_payments.
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

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Board dashboard
          </h1>
          <p className="text-sm text-slate-600">Signed in as {profile.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Lots in database" value={String(lotCount ?? 0)} />
        <Stat
          label={`Dues records (${currentYear})`}
          value={String(totalDues)}
        />
        <Stat
          label={`Paid (${currentYear})`}
          value={`${paidCount} / ${totalDues || "—"}`}
        />
      </section>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Phase 2 preview</p>
        <p className="mt-1">
          The neighborhood map, expenditure tracker, and financial dashboard
          charts arrive in Phase 2. Lot CRUD lands in M4.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/lots"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Lots (coming in M4)
          </Link>
          <Link
            href="/admin/invite"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Invite homeowner (coming in M4)
          </Link>
        </div>
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
