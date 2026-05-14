import Link from "next/link";
import { SignupClient } from "./SignupClient";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>
        <p className="mt-1 text-sm text-slate-600">
          Look up your address to get started.
        </p>
      </div>

      <SignupClient />

      <div className="border-t border-slate-200 pt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Sign in
        </Link>
      </div>

      <p className="text-xs text-slate-500">
        <Link href="/privacy" className="underline">
          Privacy notice
        </Link>
      </p>
    </main>
  );
}
