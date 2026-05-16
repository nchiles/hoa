import { requireBoard } from "@/lib/auth/requireRole";
import { updateHoaSettings } from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function HoaSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { supabase } = await requireBoard();
  const { data: settings } = await supabase
    .from("hoa_settings")
    .select(
      "name, contact_email, mailing_address, city, state, zip, fiscal_year_start_month, default_dues_amount_cents",
    )
    .eq("id", 1)
    .maybeSingle();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">HOA settings</h1>
        <p className="text-sm text-slate-600">
          Names, contact info, fiscal year, and default annual dues. Visible to
          members on the contact and dashboard pages.
        </p>
      </header>

      {params.saved && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Settings saved.
        </div>
      )}
      {params.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {params.error}
        </div>
      )}

      <form action={updateHoaSettings} className="flex flex-col gap-5">
        <Field label="HOA name" htmlFor="name" required>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={128}
            defaultValue={settings?.name ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Contact email" htmlFor="contact_email">
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={settings?.contact_email ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="City" htmlFor="city">
            <input
              id="city"
              name="city"
              type="text"
              maxLength={128}
              defaultValue={settings?.city ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="State" htmlFor="state">
            <input
              id="state"
              name="state"
              type="text"
              maxLength={64}
              placeholder="MI"
              defaultValue={settings?.state ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="ZIP" htmlFor="zip">
            <input
              id="zip"
              name="zip"
              type="text"
              maxLength={16}
              defaultValue={settings?.zip ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <p className="-mt-2 text-xs text-slate-500">
          City, state, and ZIP apply to the whole subdivision — lots only
          store their street number and street name.
        </p>

        <Field label="Mailing address" htmlFor="mailing_address">
          <textarea
            id="mailing_address"
            name="mailing_address"
            rows={3}
            maxLength={512}
            defaultValue={settings?.mailing_address ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Fiscal year start month"
            htmlFor="fiscal_year_start_month"
            required
          >
            <select
              id="fiscal_year_start_month"
              name="fiscal_year_start_month"
              defaultValue={settings?.fiscal_year_start_month ?? 1}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Default annual dues (USD)"
            htmlFor="default_dues_amount_cents"
            required
          >
            <input
              id="default_dues_amount_cents"
              name="default_dues_amount_cents"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={settings?.default_dues_amount_cents ?? 0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500">
              Entered in cents. e.g. 20000 = $200.00.
            </p>
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save settings
          </button>
        </div>
      </form>
    </main>
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
