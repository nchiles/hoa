import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LotForm } from "../../LotForm";
import { updateLot, offboardLot } from "../../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function EditLotPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: lot } = await supabase
    .from("lots")
    .select(
      "id, lot_number, street_number, street_name, address, owner_name, owner_email, owner_phone, notes",
    )
    .eq("id", id)
    .maybeSingle();

  if (!lot) notFound();

  const updateAction = updateLot.bind(null, id);
  const offboardAction = offboardLot.bind(null, id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <Link
        href={`/lots/${id}`}
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to lot
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit lot {lot.lot_number}
        </h1>
        <p className="text-sm text-slate-600">{lot.address}</p>
      </header>

      <LotForm
        action={updateAction}
        defaults={lot}
        error={error}
        submitLabel="Save changes"
        cancelHref={`/lots/${id}`}
      />

      <section className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-5">
        <h2 className="text-sm font-semibold text-rose-900">
          Offboard this lot
        </h2>
        <p className="mt-1 text-sm text-rose-800">
          Use this when ownership transfers. Clears the owner&rsquo;s name,
          email, phone, and notes, and unlinks any member account from this
          lot. Payment history is preserved.
        </p>
        <form action={offboardAction} className="mt-3">
          <button
            type="submit"
            className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Offboard lot
          </button>
        </form>
      </section>
    </main>
  );
}
