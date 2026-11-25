import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Temporary diagnostic endpoint (Phase 5) — confirms whether the Supabase auth
 * session cookie reaches the server on live. Returns only cookie *names* (never
 * values) plus the request host, so it can be used to diagnose cookie-domain
 * mismatches without leaking secrets. Safe to delete once the auth issue is
 * resolved.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const names = cookieStore.getAll().map((c) => c.name);
  const host = request.headers.get("host");
  const hasAuthCookie = names.some((n) => n.includes("auth-token") || n.startsWith("sb-"));
  return NextResponse.json({
    host,
    cookieNames: names,
    hasAuthCookie,
    note: "If hasAuthCookie is false while you are logged in, the session cookie is not reaching this host — a cookie-domain / host mismatch.",
  });
}
