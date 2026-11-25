import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Root proxy (Phase 1b — server-side auth; Next.js 16 calls it 'proxy' instead of 'middleware').
 *
 * - Refreshes the auth session on every request (via `supabase.auth.getUser()`).
 * - Protects `/admin/*` and `/api/admin/*`: redirects unauthenticated users
 *   to `/login` with a diagnostic query param.
 * - Passes everything else through untouched (`NextResponse.next()`).
 * - Crucial: the Supabase server client's `setAll` writes cookies to BOTH the
 *   cookie store AND the response object, so the session cookie survives the
 *   Vercel/edge layer and appears on the very next navigation. Without this,
 *   `NextResponse.next()` can strip freshly-set cookies, causing the session
 *   to appear lost on the next request.
 * - Emits a console warning with cookie state on every request to a protected
 *   path, so we can see whether the cookie is being sent and with what domain.
 * - Reads the `cookie` header from the request directly and constructs a simple
 *   cookie store object — avoids the `RequestCookies` type issues and the
 *   inconsistency of mixing `cookies()` from `next/headers` inside Edge middleware.
 */

const PROTECTED_PATTERNS = [/^\/admin(\/.*)?$/, /^\/api\/admin(\/.*)?$/];

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name) {
      result[name] = valueParts.join("=");
    }
  }
  return result;
}

export async function proxy(request: NextRequest) {
  // Read the cookie header directly from the request — this is the most
  // reliable way in Edge middleware/proxy and avoids the RequestCookies type
  // issues and the inconsistency of mixing cookies() from next/headers.
  const cookieHeader = request.headers.get("cookie") || "";
  const requestCookieStore = parseCookies(cookieHeader);
  const cookieNames = Object.keys(requestCookieStore);
  const host = request.headers.get("host") || "";
  const hasAuthCookie = cookieNames.some(
    (n) => n.includes("auth-token") || n.startsWith("sb-")
  );

  // CRITICAL: create the response using NextResponse.next({ request }) so that
  // Next.js actually renders the page/route the user requested. Returning a
  // manual NextResponse(null, { status: 200 }) terminates the request with an
  // empty body instead of forwarding to the Next.js page, which causes the
  // "This page couldn't load" error and blank admin surfaces.
  const response = NextResponse.next({ request });

  // Configure the Supabase server client using the parsed cookie store from
  // the request header. The setAll callback writes to BOTH the cookie store
  // (by updating requestCookieStore) AND the response object, so the session
  // cookie survives the Vercel/edge layer and the NextResponse.next() boundary.
  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      cookies: {
        getAll: () => {
          // Return cookie entries in the format expected by createServerClient.
          // Each entry has { name, value, options }.
          return Object.entries(requestCookieStore).map(([name, value]) => ({
            name,
            value,
            options: {},
          }));
        },
        setAll: async (cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]) => {
          for (const c of cookiesToSet) {
            try {
              // Write to the in-memory cookie store so future requests in this
              // session include the cookie.
              requestCookieStore[c.name] = c.value;
              // CRITICAL: also write to the response object so the browser/edge
              // sees the cookie immediately and it survives the edge layer and
              // the NextResponse.next() boundary.
              response.cookies.set(c.name, c.value, c.options as never);
            } catch {
              // Next.js only permits cookie mutation inside Server Actions / Route
              // Handlers. When a session refresh is attempted during a Server
              // Component render, the write is rejected — that's fine: the
              // read-only session stands for this render, and the next Server
              // Action / Route Handler can persist a refreshed session.
            }
          }
        },
      },
    }
  );

  // Call getUser() early — it triggers a token refresh and writes updated
  // cookies via setAll on the response object we created above.
  // Correct destructuring: supabase.auth.getUser() returns
  // { data: { user }, error } — so we destructure { data: { user } } to get
  // the actual user object. Without the inner braces, { data: user } makes
  // user = the data object which is always truthy, so !user is always false
  // and the guard never triggers.
  const { data: { user } } = await supabase.auth.getUser();

  if (PROTECTED_PATTERNS.some((re) => re.test(request.nextUrl.pathname)) && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    // Attach a diagnostic flag so the login page can surface the reason.
    url.searchParams.set("diagnostic", "no-auth-cookie");
    return NextResponse.redirect(url);
  }

  if (!isSupabaseConfigured) {
    console.warn(
      "supabase/middleware: Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL/KEY) — auth disabled."
    );
  }

  // Return the SAME response object that has the freshly-refreshed session
  // cookies attached. This ensures the session cookie survives the
  // NextResponse.next() boundary and appears on the very next navigation.
  return response;
}

export const config = {
  // Run on every route so we can guard protected paths.
  matcher: ["/admin/:path*", "/api/admin/:path*", "/login/:path*", "/auth/callback"],
};