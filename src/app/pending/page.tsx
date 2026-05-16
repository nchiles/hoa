import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && profile.status !== "pending") {
    redirect(profile.role === "board" ? "/dashboard" : "/me");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Request received
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Thanks{user.email ? `, ${user.email}` : ""}. Your request to join has
          been sent to the HOA board for approval. You&rsquo;ll be able to sign
          in and see your lot once a board member approves it.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Nothing more to do right now. We&rsquo;ll keep your request on file —
        check back after the board has had a chance to review it.
      </div>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
