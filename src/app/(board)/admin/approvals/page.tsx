import { requireBoard } from "@/lib/auth/requireRole";
import { approveProfile, rejectProfile } from "./actions";

type SearchParams = Promise<{
  approved?: string;
  rejected?: string;
  error?: string;
}>;

type PendingRow = {
  id: string;
  email: string;
  lot_id: string | null;
  created_at: string;
  lots: { lot_number: string; address: string } | null;
};

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { supabase } = await requireBoard();

  const { data: pendingData } = await supabase
    .from("profiles")
    .select("id, email, lot_id, created_at, lots ( lot_number, address )")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const pending = (pendingData ?? []) as unknown as PendingRow[];

  // Lots that already have an approved resident → dispute flag.
  const { data: activeLinked } = await supabase
    .from("profiles")
    .select("lot_id")
    .eq("status", "active")
    .not("lot_id", "is", null);
  const claimedLotIds = new Set(
    (activeLinked ?? []).map((r) => r.lot_id as string),
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pending approvals
        </h1>
        <p className="text-sm text-slate-600">
          Residents who signed up and are waiting for the board to confirm
          they belong to their lot.
        </p>
      </header>

      {params.approved && (
        <Notice tone="success">Resident approved.</Notice>
      )}
      {params.rejected && (
        <Notice tone="success">Request rejected.</Notice>
      )}
      {params.error && <Notice tone="error">{params.error}</Notice>}

      {pending.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No pending requests. New sign-ups will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((p) => {
            const disputed = p.lot_id && claimedLotIds.has(p.lot_id);
            return (
              <li
                key={p.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{p.email}</p>
                    <p className="text-sm text-slate-600">
                      {p.lots
                        ? `Lot ${p.lots.lot_number} — ${p.lots.address}`
                        : "No lot linked to this request"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Requested {new Date(p.created_at).toLocaleDateString()}
                    </p>
                    {disputed && (
                      <p className="mt-2 inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                        ⚠ Another resident is already linked to this lot —
                        verify before approving (sale, rental, or error).
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form action={rejectProfile}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Reject
                      </button>
                    </form>
                    <form action={approveProfile}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                      >
                        Approve
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
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
