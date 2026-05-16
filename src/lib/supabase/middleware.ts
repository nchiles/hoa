import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes accessible without an authenticated session.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/privacy", "/auth/callback"];

// Routes that require the 'board' role. Members hitting these get bounced to
// /me. Prefix match so /lots/123 and /admin/anything are also covered.
const BOARD_PATHS = ["/dashboard", "/lots", "/admin"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/");
}

function isBoardOnly(pathname: string) {
  return BOARD_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated visitor on a protected route → /login
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Authenticated: resolve the profile once for status + role routing.
  // RLS still enforces the real data boundary; these are friendly redirects.
  if (user && !pathname.startsWith("/auth/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    const isPending =
      profile?.status === "pending" || profile?.status === "rejected";

    // Pending/rejected users can only see the holding screen.
    if (isPending && pathname !== "/pending") {
      const url = request.nextUrl.clone();
      url.pathname = "/pending";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // An active/approved user has no reason to sit on the holding screen.
    if (!isPending && pathname === "/pending") {
      const url = request.nextUrl.clone();
      url.pathname = profile?.role === "board" ? "/dashboard" : "/me";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isBoardOnly(pathname) && profile?.role !== "board") {
      const url = request.nextUrl.clone();
      url.pathname = "/me";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
