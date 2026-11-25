import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getMiddlewareClient } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Root proxy (Phase 1b — server-side auth; Next.js 16 calls it 'proxy' instead of 'middleware').
 *
 * - Refreshes the auth session on every request (via `getUser()`).
 * - Protects `/admin/*` and `/api/admin/*`: redirects unauthenticated users
 *   to `/login`.
 * - Passes everything else through untouched (`NextResponse.next()`).
 */

const PROTECTED_PATTERNS = [/^\/admin(\/.*)?$/, /^\/api\/admin(\/.*)?$/];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookieStore = await cookies();
  const supabase = getMiddlewareClient(cookieStore as Parameters<typeof getMiddlewareClient>[0]);

  // Call getUser() early — it triggers a token refresh and writes updated
  // cookies via setAll on the response.
  const { data: user } = await supabase.auth.getUser();

  if (PROTECTED_PATTERNS.some((re) => re.test(pathname)) && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!isSupabaseConfigured) {
    console.warn(
      "supabase/middleware: Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL/KEY) — auth disabled."
    );
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route so we can guard protected paths.
  matcher: ["/admin/:path*", "/api/admin/:path*", "/login/:path*", "/auth/callback"],
};
