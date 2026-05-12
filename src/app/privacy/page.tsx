import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Notice</h1>

      <p className="text-slate-600">
        Placeholder copy — final text to be ratified by the board before launch.
      </p>

      <section className="space-y-3 text-sm leading-6 text-slate-700">
        <h2 className="text-lg font-medium text-slate-900">What we store</h2>
        <p>
          The Summer Meadows HOA portal stores your name, mailing address,
          email, optional phone number, and dues payment history.
        </p>

        <h2 className="text-lg font-medium text-slate-900">Who can see it</h2>
        <p>
          Board members can see all homeowner records as part of their fiduciary
          duties. Each homeowner can only see their own record. Aggregate
          financial information (total dues collected, expenditures) is visible
          to all signed-in members but never shows individual names.
        </p>

        <h2 className="text-lg font-medium text-slate-900">
          Payments and third parties
        </h2>
        <p>
          We do not sell your data. We do not run third-party analytics or
          advertising trackers. If online dues payment is enabled, card details
          are handled directly by Stripe and never stored on our servers.
        </p>

        <h2 className="text-lg font-medium text-slate-900">
          Requests and contact
        </h2>
        <p>
          To request changes to your record, anonymization after a sale, or
          deletion when you leave the community, contact the board at the email
          address listed on the Contact page.
        </p>
      </section>

      <Link
        href="/"
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to home
      </Link>
    </main>
  );
}
