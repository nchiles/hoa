import Link from "next/link";
import { signInWithMagicLink } from "./actions";

type SearchParams = Promise<{ sent?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Members and board only. We&rsquo;ll email you a one-time sign-in link.
        </p>
      </div>

      {sent ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-medium">Check your inbox.</p>
          <p className="mt-1">
            We sent a sign-in link to <strong>{sent}</strong>. Open it on this
            device to continue.
          </p>
        </div>
      ) : (
        <form action={signInWithMagicLink} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button
            type="submit"
            className="mt-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Email me a sign-in link
          </button>
        </form>
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500">
        New to the neighborhood?{" "}
        <Link href="/privacy" className="underline">
          Privacy notice
        </Link>{" "}
        · Need access? Ask the board to add you.
      </p>
    </main>
  );
}
