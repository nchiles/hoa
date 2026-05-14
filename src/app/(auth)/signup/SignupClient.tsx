"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";

const initial: SignupState = { stage: "idle" };

export function SignupClient() {
  const [state, formAction, isPending] = useActionState(signupAction, initial);

  if (state.stage === "sent") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">Check your inbox.</p>
        <p className="mt-1">
          We sent a sign-in link to <strong>{state.email}</strong>. Open it on
          this device to finish setting up your{" "}
          {state.role === "board" ? "board" : "homeowner"} account.
        </p>
      </div>
    );
  }

  if (state.stage === "matched") {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p>
            We found <strong>{state.address}</strong> in our records.
          </p>
          <p className="mt-1 text-slate-500">
            The email on file looks like{" "}
            <span className="font-mono">{state.emailHint}</span>. Enter your
            full email to confirm.
          </p>
        </div>

        <input type="hidden" name="intent" value="confirm_member" />
        <input type="hidden" name="address" value={state.address} />

        <Field label="Your email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>

        <div className="flex justify-between">
          <BackLink />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send sign-in link"}
          </button>
        </div>
      </form>
    );
  }

  if (state.stage === "matched_no_email") {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">
            We found <strong>{state.address}</strong>, but no email is on file
            yet.
          </p>
          <p className="mt-1">
            Ask your HOA board to add your email to your lot. Once they do, come
            back and finish signup.
          </p>
        </div>
        <BackLink />
      </div>
    );
  }

  if (state.stage === "no_match_bootstrap") {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p>
            <strong>{state.address}</strong> isn&rsquo;t in our records yet —
            and no HOA has been set up here.
          </p>
          <p className="mt-1 text-slate-500">
            Are you the president of your HOA? If so, you can set it up now.
          </p>
        </div>

        <input type="hidden" name="intent" value="onboard_president" />
        <input type="hidden" name="address" value={state.address} />

        <Field label="Your email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="attest"
            required
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            I confirm I&rsquo;m a current board member (or president) of this
            HOA and am authorized to set it up here.
          </span>
        </label>

        <div className="flex justify-between">
          <BackLink />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Set up the HOA"}
          </button>
        </div>
      </form>
    );
  }

  if (state.stage === "no_match_locked") {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-medium">
            <strong>{state.address}</strong> isn&rsquo;t in our records.
          </p>
          <p className="mt-1">
            If you live in this HOA, your board needs to add your lot before
            you can sign up. Share this link with your HOA president to get
            started.
          </p>
        </div>
        <BackLink />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="intent" value="lookup_address" />
      <Field label="Where do you live?" htmlFor="address">
        <input
          id="address"
          name="address"
          type="text"
          required
          placeholder="1234 Meadow Ln"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-slate-500">
          Enter the street address of your home.
        </p>
      </Field>

      {state.stage === "idle" && state.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {state.error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Checking…" : "Continue"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/signup"
      className="text-sm font-medium text-slate-600 hover:text-slate-900"
    >
      ← Start over
    </Link>
  );
}
