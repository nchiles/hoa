import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_HOA_NAME = "Summer Meadows HOA";

export default async function DashboardPage() {
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();

  const [
    { count: lotCount },
    { count: lotsWithEmailCount },
    { count: boardCount },
    { count: invitedHomeownerCount },
    { data: settings },
    { data: dues },
  ] = await Promise.all([
    supabase.from("lots").select("id", { count: "exact", head: true }),
    supabase
      .from("lots")
      .select("id", { count: "exact", head: true })
      .not("owner_email", "is", null),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "board"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("lot_id", "is", null),
    supabase
      .from("hoa_settings")
      .select("name, contact_email")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("dues_payments").select("status").eq("year", currentYear),
  ]);

  const settingsConfigured = Boolean(
    settings &&
      settings.name &&
      settings.name !== DEFAULT_HOA_NAME &&
      settings.contact_email,
  );
  const hasLots = (lotCount ?? 0) > 0;
  const multipleBoard = (boardCount ?? 0) > 1;
  const lotsWithEmail = lotsWithEmailCount ?? 0;
  const someHomeownersInvited =
    lotsWithEmail > 0 && (invitedHomeownerCount ?? 0) > 0;

  const steps = [
    {
      key: "settings",
      label: "Configure HOA info",
      detail: settingsConfigured
        ? `${settings?.name}`
        : "Name, contact email, fiscal year, default dues.",
      href: "/admin/settings",
      cta: settingsConfigured ? "Edit" : "Set up →",
      done: settingsConfigured,
    },
    {
      key: "lots",
      label: "Add lots",
      detail: hasLots
        ? `${lotCount} lot${lotCount === 1 ? "" : "s"} added.`
        : "Import a CSV roster or add lots one at a time.",
      href: hasLots ? "/lots" : "/lots/import",
      cta: hasLots ? "Manage" : "Import CSV →",
      done: hasLots,
    },
    {
      key: "board",
      label: "Invite board members",
      detail: multipleBoard
        ? `${boardCount} board accounts.`
        : "You're the only board member so far. Invite the rest.",
      href: "/admin/invite",
      cta: multipleBoard ? "Manage" : "Invite →",
      done: multipleBoard,
    },
    {
      key: "homeowners",
      label: "Invite homeowners",
      detail:
        lotsWithEmail === 0
          ? "Add owner emails to lots first."
          : someHomeownersInvited
            ? `At least one homeowner has signed in. Continue inviting the rest.`
            : `${lotsWithEmail} lots have an owner email and are ready to invite.`,
      href: "/admin/invite",
      cta: someHomeownersInvited ? "Continue" : "Invite →",
      done: someHomeownersInvited,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  const totalDues = dues?.length ?? 0;
  const paidCount = dues?.filter((d) => d.status === "paid").length ?? 0;
  const unpaidCount = dues?.filter((d) => d.status === "unpaid").length ?? 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Board dashboard
        </h1>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {allDone ? "Setup complete ✓" : "Get the HOA online"}
            </h2>
            <p className="text-xs text-slate-500">
              {completed} of {steps.length} steps complete
            </p>
          </div>
          {allDone && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Ready
            </span>
          )}
        </div>
        <ul className="divide-y divide-slate-100">
          {steps.map((step) => (
            <li
              key={step.key}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                    step.done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {step.done ? "✓" : ""}
                </span>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      step.done ? "text-slate-500 line-through" : "text-slate-900"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500">{step.detail}</p>
                </div>
              </div>
              <Link
                href={step.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  step.done
                    ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {step.cta}
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
