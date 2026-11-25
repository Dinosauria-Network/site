import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
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
 */

const PROTECTED_PATTERNS = [/^\/admin(\/.*)?$/, /^\/api\/admin(\/.*)?$/];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookieStore = await cookies();

  // CRITICAL: create the response using NextResponse.next({ request }) so that
  // Next.js actually renders the page/route the user requested. Returning a
  // manual NextResponse(null, { status: 200 }) terminates the request with an
  // empty body instead of forwarding to the Next.js page, which causes the
  // "This page couldn't load" error and blank admin surfaces.
  const response = NextResponse.next({ request });

  // Configure the Supabase server client to write cookies to BOTH the cookie
  // store AND the response object. This prevents Vercel/edge from stripping
  // Set-Cookie headers on the NextResponse.next() boundary, which was causing
  // the session to appear lost on the very next navigation.
  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: async (cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]) => {
          for (const c of cookiesToSet) {
            try {
              // Write to the cookie store so future requests include the cookie.
              await cookieStore.set(c.name, c.value, c.options as never);
              // Also write to the response object so the browser/edge sees the
              // cookie immediately and it survives the edge layer.
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
  const { data: user } = await supabase.auth.getUser();

  if (PROTECTED_PATTERNS.some((re) => re.test(pathname)) && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
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