import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteHomeowner } from "./actions";

type SearchParams = Promise<{
  email?: string;
  sent?: string;
  resent?: string;
  error?: string;
}>;

export default async function InvitePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Pull every lot that has an owner email — those are the homeowners we can
  // invite. Lots without an email are still listed below in a separate
  // section so the board can fix the missing data first.
  const { data: lots } = await supabase
    .from("lots")
    .select("id, lot_number, address, owner_name, owner_email")
    .order("lot_number");

  const lotsWithEmail = lots?.filter((l) => l.owner_email) ?? [];
  const lotsWithoutEmail = lots?.filter((l) => !l.owner_email) ?? [];

  // Cross-check against auth.users so we can show "Already signed up" vs
  // "Invite sent, awaiting click" status. Requires the service-role key; if
  // it's missing we still render the page but flag the misconfiguration.
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const usersByEmail = new Map<string, { id: string; confirmed: boolean }>();
  if (hasServiceRole) {
    const admin = createAdminClient();
    const { data: usersData } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    for (const u of usersData?.users ?? []) {
      if (u.email) {
        usersByEmail.set(u.email.toLowerCase(), {
          id: u.id,
          confirmed: Boolean(u.last_sign_in_at),
        });
      }
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Invite homeowners</h1>
        <p className="text-sm text-slate-600">
          Send each homeowner a magic-link invite. Re-sending generates a fresh
          link if they lost the original.
        </p>
      </header>

      {params.sent && (
        <Notice tone="success">
          Invite sent to <strong>{params.sent}</strong>.
        </Notice>
      )}
      {params.resent && (
        <Notice tone="success">
          Fresh sign-in link sent to <strong>{params.resent}</strong>.
        </Notice>
      )}
      {params.error && <Notice tone="error">{params.error}</Notice>}

      {!hasServiceRole && (
        <Notice tone="error">
          <p className="font-medium">Service-role key not configured.</p>
          <p className="mt-1">
            Set <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>{" "}
            (Supabase dashboard → Project Settings → API). Without it, invites
            cannot be sent and we can&rsquo;t show signup status.
          </p>
        </Notice>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Lots with an owner email ({lotsWithEmail.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {lotsWithEmail.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No lots have owner emails set yet. Add an email to a lot first.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Lot</th>
                  <th className="px-4 py-2 font-medium">Owner</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lotsWithEmail.map((lot) => {
                  const user = usersByEmail.get(
                    (lot.owner_email ?? "").toLowerCase(),
                  );
                  const status: "new" | "invited" | "active" = !user
                    ? "new"
                    : user.confirmed
                      ? "active"
                      : "invited";
                  const focused =
                    params.email &&
                    params.email.toLowerCase() ===
                      (lot.owner_email ?? "").toLowerCase();
                  return (
                    <tr
                      key={lot.id}
                      className={focused ? "bg-amber-50" : "hover:bg-slate-50"}
                    >
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {lot.lot_number}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {lot.owner_name || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {lot.owner_email}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <form
                          action={inviteHomeowner}
                          className="inline-flex gap-2"
                        >
                          <input
                            type="hidden"
                            name="lot_id"
                            value={lot.id}
                          />
                          <input
                            type="hidden"
                            name="email"
                            value={lot.owner_email ?? ""}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {status === "new"
                              ? "Send invite"
                              : "Resend link"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {lotsWithoutEmail.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Lots missing an owner email ({lotsWithoutEmail.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Lot</th>
                  <th className="px-4 py-2 font-medium">Address</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lotsWithoutEmail.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {lot.lot_number}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{lot.address}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/lots/${lot.id}/edit`}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        Add email →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: "new" | "invited" | "active" }) {
  const config = {
    new: {
      label: "Not invited",
      cls: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    invited: {
      label: "Invited, no sign-in yet",
      cls: "bg-amber-100 text-amber-800 ring-amber-200",
    },
    active: {
      label: "Active",
      cls: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.cls}`}
    >
      {config.label}
    </span>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose-200 bg-rose-50 text-rose-900";
  return (
    <div className={`rounded-md border p-4 text-sm ${cls}`}>{children}</div>
  );
}
