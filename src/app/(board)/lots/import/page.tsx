import Link from "next/link";
import { requireBoard } from "@/lib/auth/requireRole";
import { ImportClient } from "./ImportClient";

const COLUMNS: { name: string; required: boolean; note: string }[] = [
  { name: "lot_number", required: true, note: "Unique per lot, e.g. 12" },
  { name: "address", required: true, note: "Street address" },
  { name: "owner_name", required: false, note: "Leave blank if vacant" },
  { name: "owner_email", required: false, note: "Needed to invite them later" },
  { name: "owner_phone", required: false, note: "Optional" },
  { name: "notes", required: false, note: "Board-only, optional" },
];

type SearchParams = Promise<{ error?: string }>;

export default async function ImportLotsPage({
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
            Import lots from CSV
          </h1>
          <p className="text-sm text-slate-600">
            Upload a CSV with the columns below. Empty cells become null. Owner
            email and phone are optional. You can edit any row afterward from
            the lots list.
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

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">
              Not sure how to format it?
            </p>
            <p className="text-sm text-slate-600">
              Download the template, fill in your lots, and upload it back.
            </p>
          </div>
          <a
            href="/lot-import-template.csv"
            download
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Download CSV template
          </a>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-1 pr-4 font-medium">Column</th>
              <th className="py-1 pr-4 font-medium">Required</th>
              <th className="py-1 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {COLUMNS.map((c) => (
              <tr key={c.name}>
                <td className="py-1.5 pr-4 font-mono text-xs text-slate-800">
                  {c.name}
                </td>
                <td className="py-1.5 pr-4 text-slate-600">
                  {c.required ? "Yes" : "Optional"}
                </td>
                <td className="py-1.5 text-slate-600">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ImportClient />
    </main>
  );
}
