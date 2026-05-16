"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { searchAddresses, signupAction, type SignupState } from "./actions";

const initial: SignupState = { stage: "idle" };

export function SignupClient() {
  const [state, formAction, isPending] = useActionState(signupAction, initial);

  if (state.stage === "sent") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">Check your inbox.</p>
        {state.kind === "pending" ? (
          <p className="mt-1">
            We sent a sign-in link to <strong>{state.email}</strong>. Open it
            to confirm your email — then your request goes to the board for
            approval. You&rsquo;ll get access once they approve it.
          </p>
        ) : (
          <p className="mt-1">
            We sent a sign-in link to <strong>{state.email}</strong>. Open it
            on this device to finish setting up your board account.
          </p>
        )}
      </div>
    );
  }

  if (state.stage === "claimable") {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p>
            <strong>{state.address}</strong> is part of the{" "}
            <strong>{state.hoaName}</strong> HOA.
          </p>
          <p className="mt-1 text-slate-500">
            Continue to claim it — your request will be sent to the board for
            approval.
          </p>
        </div>

        <input type="hidden" name="intent" value="claim_lot" />
        <input type="hidden" name="address" value={state.address} />

        {state.error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {state.error}
          </div>
        )}

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
            {isPending ? "Sending…" : "Claim this lot"}
          </button>
        </div>
      </form>
    );
  }

  if (state.stage === "share") {
    return <ShareWithBoard address={state.address} />;
  }

  if (state.stage === "no_match") {
    if (!state.canBootstrap) {
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">
              <strong>{state.address}</strong> isn&rsquo;t a lot in this HOA.
            </p>
            <p className="mt-1">
              If you live here, ask your board to add your lot, then sign up.
              If you&rsquo;re on the board, sign in or have another board
              member invite you.
            </p>
          </div>
          <ShareWithBoard address={state.address} embedded />
          <p className="text-sm text-slate-600">
            <Link
              href="/login"
              className="font-medium text-slate-900 underline"
            >
              Sign in instead
            </Link>
          </p>
          <BackLink />
        </div>
      );
    }
    return <NoMatchBootstrap state={state} formAction={formAction} isPending={isPending} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="intent" value="lookup_address" />
      <AddressAutocomplete
        error={state.stage === "idle" ? state.error : undefined}
      />
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

function NoMatchBootstrap({
  state,
  formAction,
  isPending,
}: {
  state: Extract<SignupState, { stage: "no_match" }>;
  formAction: (formData: FormData) => void;
  isPending: boolean;
}) {
  const [resident, setResident] = useState(false);

  if (resident) {
    return <ShareWithBoard address={state.address} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
        <p>
          We couldn&rsquo;t find <strong>{state.address}</strong>, and no HOA
          has been set up here yet.
        </p>
        <p className="mt-1 text-slate-500">
          If you&rsquo;re on the board, set it up now. Otherwise, let your
          board know about the app.
        </p>
      </div>

      <input type="hidden" name="intent" value="onboard_president" />
      <input type="hidden" name="address" value={state.address} />

      {state.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {state.error}
        </div>
      )}

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
          I confirm I&rsquo;m a current board member (or president) of this HOA
          and am authorized to set it up here.
        </span>
      </label>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setResident(true)}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          I&rsquo;m not on the board →
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Set up the HOA"}
        </button>
      </div>
      <BackLink />
    </form>
  );
}

function ShareWithBoard({
  address,
  embedded,
}: {
  address: string;
  embedded?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const mailto = `mailto:?subject=${encodeURIComponent(
    "Set up our HOA portal",
  )}&body=${encodeURIComponent(
    `Our HOA can manage dues, lots, and documents here: ${appUrl}\n\n` +
      `I tried to sign up with ${address} but our HOA isn't set up yet. ` +
      `Could you (the board) set it up?`,
  )}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!embedded && (
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p>
            <strong>{address}</strong> isn&rsquo;t in the system yet.
          </p>
          <p className="mt-1 text-slate-500">
            Only your HOA board can add lots. Share the app with whoever runs
            your HOA so they can set it up.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {copied ? "Link copied ✓" : "Copy app link"}
        </button>
        <a
          href={mailto}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Email the board
        </a>
      </div>

      {!embedded && <BackLink />}
    </div>
  );
}

function AddressAutocomplete({ error }: { error?: string }) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: string; address: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // True once the user picked a suggestion (or retyped an exact suggestion).
  const [picked, setPicked] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (picked) return;
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const results = await searchAddresses(q);
      setSuggestions(results);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [value, picked]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(addr: string) {
    setValue(addr);
    setPicked(true);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="flex flex-col gap-1" ref={boxRef}>
      <label htmlFor="address" className="text-sm font-medium text-slate-700">
        Where do you live?
      </label>
      <div className="relative">
        <input
          id="address"
          name="address"
          type="text"
          required
          autoComplete="off"
          value={value}
          placeholder="Start typing your street address…"
          onChange={(e) => {
            setValue(e.target.value);
            setPicked(false);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => choose(s.address)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {s.address}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {picked ? (
        <p className="text-xs font-medium text-emerald-700">
          ✓ We found this address in the HOA records.
        </p>
      ) : loading ? (
        <p className="text-xs text-slate-400">Searching…</p>
      ) : value.trim().length >= 2 && suggestions.length === 0 ? (
        <p className="text-xs text-slate-500">
          No match yet. Keep typing, or continue — if your home isn&rsquo;t
          listed we&rsquo;ll help you set up the HOA.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Pick your address from the list as it appears.
        </p>
      )}

      {error && (
        <div className="mt-1 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}
    </div>
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
