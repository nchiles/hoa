import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Self-heal: if profile.lot_id is null but a lot now exists with a matching
  // owner_email, link them. Handles the bootstrap case (sign-in before lot
  // exists) and any later board edits to lots.owner_email. No-op once linked.
  await supabase.rpc("relink_my_lot");

  // RLS lets the user read only their own profile row and (via lot_id) their
  // own lot. No cross-lot data leaks through here.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role, lot_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <Shell email={user.email ?? ""}>
        <Notice tone="error">
          Your account is signed in but has no profile record. Contact the board
          to fix this.
        </Notice>
      </Shell>
    );
  }

  if (!profile.lot_id) {
    return (
      <Shell email={profile.email}>
        <Notice tone="warning">
          Your email isn&rsquo;t linked to a lot in our records. If you just
          purchased a home in Summer Meadows, please contact the board so they
          can connect your account to your lot.
        </Notice>
      </Shell>
    );
  }

  const [{ data: lot }, { data: dues }] = await Promise.all([
    supabase
      .from("lots")
      .select("lot_number, address, owner_name, owner_email, owner_phone")
      .eq("id", profile.lot_id)
      .maybeSingle(),
    supabase
      .from("dues_payments")
      .select("year, amount_due, amount_paid, paid_date, method, status")
      .eq("lot_id", profile.lot_id)
      .order("year", { ascending: false }),
  ]);

  const currentYear = new Date().getFullYear();
  const currentDues = dues?.find((d) => d.year === currentYear);
  const history = dues?.filter((d) => d.year !== currentYear) ?? [];

  return (
    <Shell email={profile.email}>
      {lot ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Your lot
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-lg font-semibold text-slate-900">
              Lot {lot.lot_number}
            </p>
            <p className="text-sm text-slate-600">{lot.address}</p>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Row label="Owner" value={lot.owner_name} />
              <Row label="Email" value={lot.owner_email} />
              <Row label="Phone" value={lot.owner_phone} />
            </dl>
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Current year dues ({currentYear})
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          {currentDues ? (
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <StatusBadge status={currentDues.status} />
                {currentDues.paid_date && (
                  <p className="mt-1 text-xs text-slate-500">
                    Paid {currentDues.paid_date}
                    {currentDues.method ? ` via ${currentDues.method}` : null}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Paid / due</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  ${money(currentDues.amount_paid)} /{" "}
                  ${money(currentDues.amount_due)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No dues record for {currentYear} yet. The board may not have
              opened the current dues cycle.
            </p>
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Payment history
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Year</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Paid</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((d) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Shell>
  );
}

function Shell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
          <p className="text-sm text-slate-600">Signed in as {email}</p>
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
      {children}
      <footer className="mt-auto pt-8 text-xs text-slate-500">
        <a href="/privacy" className="hover:text-slate-700">
          Privacy notice
        </a>
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{value || "—"}</dd>
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

function Notice({
  tone,
  children,
}: {
  tone: "error" | "warning";
  children: React.ReactNode;
}) {
  const cls =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <div className={`rounded-md border p-4 text-sm ${cls}`}>{children}</div>
  );
}

function money(n: number | string | null): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return v.toFixed(2);
}
