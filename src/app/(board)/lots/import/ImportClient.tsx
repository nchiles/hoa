"use client";

import { useActionState } from "react";
import {
  parseCsvAction,
  commitCsvImport,
  type ImportState,
} from "./actions";

const initial: ImportState = { stage: "idle" };

export function ImportClient() {
  const [state, formAction, isPending] = useActionState(parseCsvAction, initial);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <label className="text-sm font-medium text-slate-700">
          Choose CSV file
        </label>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
        />
        <div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending ? "Parsing…" : "Parse & preview"}
          </button>
        </div>
      </form>

      {state.stage === "error" && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-medium">{state.message}</p>
          {state.rowErrors && state.rowErrors.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {state.rowErrors.slice(0, 20).map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  Line {e.line}: {e.message}
                </li>
              ))}
              {state.rowErrors.length > 20 && (
                <li>…and {state.rowErrors.length - 20} more.</li>
              )}
            </ul>
          )}
        </div>
      )}

      {state.stage === "preview" && (
        <section className="space-y-3">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Parsed <strong>{state.rows.length}</strong> rows. Review then
            confirm to insert.
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Lot</th>
                  <th className="px-3 py-2 font-medium">Address</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {r.lot_number}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {`${r.street_number} ${r.street_name}`}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.owner_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.owner_email ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.owner_phone ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={commitCsvImport} className="flex justify-end">
            <input type="hidden" name="payload" value={state.payload} />
            <button
              type="submit"
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Confirm import ({state.rows.length} rows)
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
