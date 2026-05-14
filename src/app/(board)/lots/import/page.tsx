import Link from "next/link";
import { requireBoard } from "@/lib/auth/requireRole";
import { REQUIRED_HEADERS } from "@/lib/validators/lotCsv";
import { ImportClient } from "./ImportClient";

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

      <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="font-medium">Expected header row:</p>
        <pre className="mt-1 overflow-x-auto rounded bg-slate-50 px-3 py-2 font-mono text-xs">
          {REQUIRED_HEADERS.join(",")}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Sample row: <code>12,1234 Meadow Ln,Alice Example,alice@example.com,616-555-0100,</code>
        </p>
      </section>

      <ImportClient />
    </main>
  );
}
