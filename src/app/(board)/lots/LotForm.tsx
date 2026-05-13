type LotDefaults = {
  lot_number?: string | null;
  address?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  notes?: string | null;
};

export function LotForm({
  action,
  defaults,
  error,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  defaults?: LotDefaults;
  error?: string;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lot number" htmlFor="lot_number" required>
          <input
            id="lot_number"
            name="lot_number"
            type="text"
            required
            maxLength={32}
            defaultValue={defaults?.lot_number ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </Field>

        <Field label="Address" htmlFor="address" required>
          <input
            id="address"
            name="address"
            type="text"
            required
            maxLength={256}
            defaultValue={defaults?.address ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </Field>

        <Field label="Owner name" htmlFor="owner_name">
          <input
            id="owner_name"
            name="owner_name"
            type="text"
            maxLength={128}
            defaultValue={defaults?.owner_name ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </Field>

        <Field label="Owner email" htmlFor="owner_email">
          <input
            id="owner_email"
            name="owner_email"
            type="email"
            defaultValue={defaults?.owner_email ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </Field>

        <Field label="Owner phone" htmlFor="owner_phone">
          <input
            id="owner_phone"
            name="owner_phone"
            type="tel"
            maxLength={32}
            defaultValue={defaults?.owner_phone ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </Field>
      </div>

      <Field label="Board notes" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={defaults?.notes ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </Field>

      <div className="flex justify-end gap-2">
        <a
          href={cancelHref}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      {children}
    </div>
  );
}
