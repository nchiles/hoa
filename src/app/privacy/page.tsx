import Link from "next/link";

const LAST_UPDATED = "May 13, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Privacy Notice
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Last updated {LAST_UPDATED}
        </p>
      </div>

      <section className="space-y-4 text-sm leading-6 text-slate-700">
        <p>
          This portal is operated by the Summer Meadows HOA board for the
          purpose of managing dues, expenditures, lot records, and bylaws for
          our community. This page explains what information we collect, who
          can see it, and how to request changes.
        </p>

        <h2 className="text-lg font-medium text-slate-900">What we store</h2>
        <p>
          For each lot we record the lot number, street address, owner name,
          owner email, optional phone number, and any board notes. We also
          record dues activity (year, amount due, amount paid, date, method)
          and HOA expenditures (date, vendor, amount, category, optional
          receipt). When a new owner signs up, we collect the address they
          enter so we can match it against an existing lot record.
        </p>

        <h2 className="text-lg font-medium text-slate-900">Who can see it</h2>
        <p>
          Board members can see all lot records and financial data — this is
          part of their fiduciary duty to the community. Each homeowner can
          only see their own lot and their own dues history. Aggregate
          financial information (total collected, total spent, breakdown by
          category) is visible to all signed-in members but never identifies
          individual homeowners.
        </p>
        <p>
          Access controls are enforced at the database level (row-level
          security), not just in the user interface.
        </p>

        <h2 className="text-lg font-medium text-slate-900">
          Payments and third parties
        </h2>
        <p>
          We do not sell or share your data with advertisers. The site runs no
          third-party analytics, advertising trackers, or social media pixels.
          If online dues payment is enabled in the future, card details will be
          handled directly by Stripe under their PCI-compliant infrastructure
          and never stored on our servers — we will only keep a payment
          reference, amount, date, and status.
        </p>

        <h2 className="text-lg font-medium text-slate-900">
          When you leave the community
        </h2>
        <p>
          When a lot changes hands, the board uses an offboarding action that
          clears the prior owner&rsquo;s personal information (name, email,
          phone, and board notes) from the lot record while preserving the
          anonymized payment history. We retain the payment history because
          it&rsquo;s necessary for the HOA&rsquo;s ongoing financial records.
        </p>

        <h2 className="text-lg font-medium text-slate-900">
          Requests and contact
        </h2>
        <p>
          To correct your record, request the email on file be updated, or
          request anonymization after a sale, email the board at the address
          listed on the Contact page. We will respond within a reasonable
          period.
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
