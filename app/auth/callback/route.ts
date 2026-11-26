import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUserToProfiles } from "@/lib/supabase/users";
import { supabaseConfig } from "@/lib/supabase/config";
import { getSafeBaseUrl, warnOnHostMismatch } from "@/lib/supabase/base-url";

/**
 * OAuth callback — exchanges the authorization code for a session and redirects
 * to `next` with the session cookies attached to *that same* response.
 *
 * Three rules that this file has to keep, each of which has broken live auth:
 *
 * 1. The redirect goes to the host the browser actually used. Session cookies
 *    are host-only, so www → apex drops them. See lib/supabase/base-url.ts.
 * 2. A failed `syncUserToProfiles` must NOT discard the session. The exchange
 *    already succeeded; profile sync is bookkeeping. Throwing it into the
 *    outer catch used to return a fresh redirect with zero cookies, so a valid
 *    Google login ended up "signed out" with no cookie anywhere.
 * 3. Every exit writes `din-auth-diag`, a short readable cookie describing what
 *    happened. `/api/debug/auth` reports it, so the callback is observable even
 *    when the user doesn't notice the landing URL.
 */

const DIAG_COOKIE = "din-auth-diag";
const DIAG_MAX_AGE = 600; // 10 minutes — long enough to go and look.

/** Only same-origin absolute paths; `//evil.com` is protocol-relative, not a path. */
function safeNextPath(next: string | null): string {
  const value = next ?? "/admin";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value;
}

/** Cookie values may not contain control chars, `;`, `,` or spaces. */
function sanitize(text: string): string {
  return text.replace(/[^A-Za-z0-9._~:/?=@|+\-[\]]/g, "_").slice(0, 200);
}

/** `auth-token.0:3180|auth-token.1:1024` — short, and comparable with the proxy. */
function describeCookies(cookies: { name: string; value: string }[]): string {
  return cookies
    .map((c) => `${c.name.replace(/^sb-[a-z0-9]+-/, "")}:${c.value.length}`)
    .join("|");
}

/**
 * Attach everything the Supabase client wrote to the response we actually
 * return, then stamp the outcome cookie. `carry` is the response the client's
 * setAll wrote to, which is not necessarily the one we return.
 */
function finish(
  response: NextResponse,
  outcome: string,
  carry?: NextResponse
): NextResponse {
  if (carry) {
    for (const cookie of carry.cookies.getAll()) {
      response.cookies.set(cookie);
    }
  }
  response.cookies.set(DIAG_COOKIE, sanitize(outcome), {
    path: "/",
    maxAge: DIAG_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  console.warn("auth/callback:", outcome);
  return response;
}

export async function GET(request: Request) {
  const baseUrl = getSafeBaseUrl(request);
  warnOnHostMismatch(request);

  const { searchParams } = new URL(request.url, "http://localhost");
  const code = searchParams.get("code");
  const safeNext = safeNextPath(searchParams.get("next"));

  if (!code) {
    // No code means the provider (or Supabase) never completed the flow —
    // usually a redirect-URL allowlist mismatch, which sends the browser to
    // the Site URL instead of /auth/callback.
    return finish(
      NextResponse.redirect(
        new URL(`/login?auth=no-code&next=${encodeURIComponent(safeNext)}`, baseUrl)
      ),
      "no-code: callback reached without ?code — check the Supabase redirect allowlist"
    );
  }

  const cookieStore = await cookies();

  // Created before the exchange so setAll has a response to write to. The URL
  // is rebuilt at the end (to carry the cookie count) and the cookies are
  // copied across, so rule 2 above still holds on every path.
  const sink = NextResponse.redirect(new URL(safeNext, baseUrl));

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Read-only context — the response below is the source of truth.
          }
          sink.cookies.set(name, value, options);
        }
      },
    },
  });

  let authUser: Parameters<typeof syncUserToProfiles>[0] | null = null;

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return finish(
        NextResponse.redirect(
          new URL(
            `/login?error=auth-code-error&detail=${encodeURIComponent(
              error.message.slice(0, 140)
            )}&next=${encodeURIComponent(safeNext)}`,
            baseUrl
          )
        ),
        `exchange-error: ${error.message}`,
        sink
      );
    }

    authUser = data.user ?? null;
  } catch (e) {
    return finish(
      NextResponse.redirect(
        new URL(
          `/login?auth=error&detail=${encodeURIComponent(
            String(e).slice(0, 140)
          )}&next=${encodeURIComponent(safeNext)}`,
          baseUrl
        )
      ),
      `exchange-threw: ${String(e)}`,
      sink
    );
  }

  // Bookkeeping only. If the DB is unreachable the user is still signed in —
  // they may just have no profile row yet (which /login explains as no-profile).
  let syncNote = "";
  if (authUser) {
    try {
      await syncUserToProfiles(authUser);
    } catch (e) {
      syncNote = ` sync-failed: ${String(e).slice(0, 90)}`;
      console.warn("auth/callback: profile sync failed (session kept):", String(e));
    }
  }

  const written = sink.cookies.getAll();
  const sessionCookies = written.filter((c) => c.name.includes("auth-token"));

  if (sessionCookies.length === 0) {
    // The exchange reported success but produced no session cookie. Say so
    // instead of redirecting to /admin as if it worked.
    return finish(
      NextResponse.redirect(
        new URL(
          `/login?diagnostic=no-cookie&detail=${encodeURIComponent(
            "code exchanged, but no session cookie was issued"
          )}&next=${encodeURIComponent(safeNext)}`,
          baseUrl
        )
      ),
      `exchange-ok-but-no-cookies (all=${written.length})${syncNote}`,
      sink
    );
  }

  console.warn(
    "auth/callback: issuing",
    sessionCookies.length,
    "session cookie(s):",
    written.map((c) => c.name).join(", ")
  );

  const finalUrl = new URL(safeNext, baseUrl);
  finalUrl.searchParams.set("auth", "ok");
  finalUrl.searchParams.set("c", String(sessionCookies.length));

  return finish(
    NextResponse.redirect(finalUrl),
    `ok c=${sessionCookies.length}/${written.length} [${describeCookies(written)}] -> ${finalUrl.host}${finalUrl.pathname}${syncNote}`,
    sink
  );
}
