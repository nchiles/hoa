import Link from "next/link";
import { requireBoard } from "@/lib/auth/requireRole";

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireBoard();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-semibold tracking-tight text-slate-900"
            >
              Summer Meadows HOA
            </Link>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/lots" className="hover:text-slate-900">
                Lots
              </Link>
              <Link href="/admin/invite" className="hover:text-slate-900">
                Invite
              </Link>
              <Link href="/admin/settings" className="hover:text-slate-900">
                Settings
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{profile.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      {children}
      <footer className="mx-auto max-w-5xl px-6 py-8 text-xs text-slate-500">
        <Link href="/privacy" className="hover:text-slate-700">
          Privacy notice
        </Link>
      </footer>
    </div>
  );
}
