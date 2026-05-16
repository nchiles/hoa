import Link from "next/link";
import { LotForm } from "../LotForm";
import { createLot } from "../actions";

type SearchParams = Promise<{ error?: string }>;

export default async function NewLotPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <Link
        href="/lots"
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← All lots
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Add lot</h1>
        <p className="text-sm text-slate-600">
          Lot number, street number, and street name are required. If you add
          an owner email, you can send an invite from the lot detail page.
        </p>
      </header>
      <LotForm
        action={createLot}
        error={error}
        submitLabel="Create lot"
        cancelHref="/lots"
      />
    </main>
  );
}
