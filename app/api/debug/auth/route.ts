import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClientNow } from "@/lib/supabase/server";
import { supabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Public auth diagnostic — `/api/debug/auth`.
 *
 * Deliberately lives OUTSIDE the proxy matcher (`/admin`, `/api/admin`), so it
 * still answers when auth is broken. The previous diagnostic lived under
 * `/api/admin/*` and was therefore redirected to /login by the proxy exactly
 * when it was needed — it could never report `hasSessionCookie: false`.
 *
 * It reports only cookie NAMES and lengths, never values. The email it returns
 * is the caller's own session, which they already know.
 *
 * Usage: sign in, then open https://<host>/api/debug/auth
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  const hostMismatch = () => {
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!configured || !host) return null;
    try {
      const configuredHost = new URL(configured).host;
      return configuredHost === host
        ? null
        : `NEXT_PUBLIC_SITE_URL is ${configuredHost} but this request is on ${host}. ` +
            `Auth redirects follow the request host (cookies are host-only), so ` +
            `set NEXT_PUBLIC_SITE_URL=https://${host} in Vercel if that is the real domain.`;
    } catch {
      return "NEXT_PUBLIC_SITE_URL is not a valid URL";
    }
  };

  const sessionCookies = all
    .filter((c) => c.name.startsWith("sb-"))
    .map((c) => ({
      name: c.name,
      length: c.value.length,
      // A chunked cookie is only usable if .0, .1, … are all present.
      chunk: /\.(\d+)$/.exec(c.name)?.[1] ?? null,
    }));

  const chunks = sessionCookies
    .map((c) => c.chunk)
    .filter((c): c is string => c !== null)
    .map(Number)
    .sort((a, b) => a - b);

  const missingChunks: number[] = [];
  if (chunks.length > 0) {
    for (let i = 0; i < Math.max(...chunks); i += 1) {
      if (!chunks.includes(i)) missingChunks.push(i);
    }
  }

  let user: { id: string; email: string | null } | null = null;
  let getUserError: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerClientNow();
      const { data, error } = await supabase.auth.getUser();
      user = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
      getUserError = error?.message ?? null;
    } catch (e) {
      getUserError = String(e).slice(0, 200);
    }
  }

  return NextResponse.json(
    {
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
      siteUrlEnv: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      // The usual culprit: the configured site URL is a different host from the
      // one serving the request, so a redirect lands where the host-only
      // session cookie is not sent.
      hostMismatch: hostMismatch(),
      vercelUrlEnv: process.env.VERCEL_URL ?? null,
      supabaseConfigured: isSupabaseConfigured,
      supabaseHost: supabaseConfig.url ? new URL(supabaseConfig.url).host : null,
      allCookieNames: all.map((c) => c.name),
      sessionCookies,
      missingChunks,
      user,
      getUserError,
      verdict: !isSupabaseConfigured
        ? "supabase-not-configured"
        : all.length === 0
          ? "no-cookies-at-all — the browser sent nothing for this host"
          : sessionCookies.length === 0
            ? "no-session-cookie — the browser sent cookies, but no sb-* session cookie"
            : missingChunks.length > 0
              ? "broken-chunking — a session cookie chunk is missing, so the token cannot be reassembled"
              : getUserError
                ? "session-present-but-getuser-failed — cookies are fine; Supabase rejected or could not verify them"
                : user
                  ? "ok — server can read the session"
                  : "session-present-but-anonymous — cookies arrived but produced no user",
    },
    { headers: { "cache-control": "no-store" } }
  );
}
