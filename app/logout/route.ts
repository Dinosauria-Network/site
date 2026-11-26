import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/supabase/config";
import { getSafeBaseUrl } from "@/lib/supabase/base-url";

/**
 * Sign out — POST only.
 *
 * This was a GET, linked from the admin nav with `next/link`. Next.js prefetches
 * every <Link> that enters the viewport, so simply *rendering* the admin page
 * fired `GET /logout` in the background, which called signOut() and deleted the
 * session cookies. The dashboard request itself succeeded; the prefetch wiped
 * the cookies a moment later; the next click was already logged out with
 * `diagnostic=no-cookie`. Browsers preload and security scanners crawl GETs too,
 * so the fix is not `prefetch={false}` — a state-changing action must not be a
 * GET at all.
 *
 * `scope: "local"` revokes only this browser's session, so signing out of the
 * admin does not kick the same account off other devices.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();

  // Response first, then attach the cookie deletions to it — same pattern as
  // the OAuth callback, so the cleared cookies cannot be dropped in transit.
  const response = NextResponse.redirect(
    new URL("/login?signedout=1", getSafeBaseUrl(request)),
    303
  );

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Read-only context — the response below carries the deletion.
          }
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.warn("logout error:", error.message);

  return response;
}

/** A GET must never end a session. 405 with the allowed method, no side effects. */
export async function GET() {
  return NextResponse.json(
    { error: "Sign-out requires POST." },
    { status: 405, headers: { allow: "POST" } }
  );
}
