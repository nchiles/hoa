import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Summer Meadows HOA
      </h1>
      <p className="text-slate-600">
        Member and board portal. Sign in to view your lot, dues status, and
        community finances.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign in
        </Link>
        <Link
          href="/privacy"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Privacy notice
        </Link>
      </div>
    </main>
  );
}
