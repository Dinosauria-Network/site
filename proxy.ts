import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Root proxy (Next.js 16 — formerly `middleware.ts`).
 *
 * This follows the canonical @supabase/ssr pattern exactly:
 *   - cookies are read from `request.cookies.getAll()`
 *   - `setAll` mutates `request.cookies` and then rebuilds the response so the
 *     refreshed session is forwarded to the page *and* back to the browser
 *   - a redirect response re-attaches every cookie the client wrote, so a
 *     session refresh/clear is never silently dropped on the way to /login
 *
 * It only guards `/admin/*` and `/api/admin/*`. It is deliberately NOT run on
 * `/auth/callback` — the callback must be free to exchange the code and write
 * its own Set-Cookie headers without the proxy touching them first.
 *
 * Diagnostics: when an unauthenticated request hits a protected path we now
 * distinguish the three very different causes, because they need different
 * fixes:
 *   no-cookie       → the browser never sent any `sb-*` cookie (storage /
 *                     domain / SameSite problem, or the callback never ran)
 *   invalid-session → cookies arrived but Supabase rejected them (expired
 *                     refresh token, wrong project, revoked session)
 *   getuser-error   → cookies arrived but the getUser() call itself failed
 *                     (network / DNS / Supabase outage) — NOT a cookie problem
 */

const PROTECTED_PATTERNS = [/^\/admin(\/.*)?$/, /^\/api\/admin(\/.*)?$/];

/** Same fallback chain as the OAuth callback — never trust `request.url` alone. */
function getSafeBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");

  if (host) return `${proto}://${host}`;

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return request.nextUrl.origin || "http://localhost:3000";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Capture this BEFORE any Supabase call — a failed getUser() can clear
  // cookies, and we still want to know what the browser actually sent.
  const hadSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Update the request so downstream reads see the new values.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Rebuild the response from the mutated request and mirror the
          //    cookies onto it so they reach the browser on this same response.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Note the destructuring: `getUser()` returns { data: { user }, error }.
  // `{ data: user }` would make `user` the data object — always truthy — and
  // the guard below would never fire.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATTERNS.some((re) => re.test(pathname));
  if (!isProtected || user) {
    if (!isSupabaseConfigured) {
      console.warn(
        "proxy: Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY) — auth disabled."
      );
    }
    return response;
  }

  // Unauthenticated on a protected path. Say *why*, precisely.
  const diagnostic = !hadSessionCookie
    ? "no-cookie"
    : userError
      ? "getuser-error"
      : "invalid-session";

  const url = new URL("/login", getSafeBaseUrl(request));
  url.searchParams.set("next", pathname);
  url.searchParams.set("diagnostic", diagnostic);
  if (userError?.message) {
    url.searchParams.set("detail", userError.message.slice(0, 120));
  }

  console.warn(
    `proxy: blocked ${pathname} (${diagnostic})` +
      (userError?.message ? ` — ${userError.message}` : "")
  );

  const redirect = NextResponse.redirect(url);
  // Carry over anything setAll wrote (e.g. cleared/refreshed cookies) — a
  // redirect that drops them is how a "logged in" user gets bounced forever.
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  // Deliberately excludes /auth/callback and /api/debug/*.
  matcher: ["/admin/:path*", "/api/admin/:path*", "/login/:path*"],
};
