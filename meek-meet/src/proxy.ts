import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the `middleware` file convention to `proxy`.
export async function proxy(request: NextRequest) {
  // Anonymous visitors (no Supabase auth cookie): skip the auth round-trip
  // entirely. updateSession calls supabase.auth.getUser() — a full HTTP call
  // to Supabase on EVERY page load — and public pages need no identity. This
  // was hundreds of ms of fixed latency on every marketing page.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.includes("-auth-token"));

  if (!hasAuthCookie) {
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (route handlers do their own auth; avoids a Supabase auth
     *   round-trip on every API/cron call)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
