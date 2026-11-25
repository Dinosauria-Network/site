import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUserToProfiles } from "@/lib/supabase/users";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * OAuth callback (Phase 1b) — exchanges the authorization code for a Supabase
 * session, syncs the user to user_profiles, and redirects to the post-login
 * destination with the session cookie explicitly attached to the redirect
 * response. This prevents Vercel/edge from stripping the Set-Cookie header
 * on redirect, which was causing the session to disappear on navigation.
 *
 * Critical pattern: create the redirect response FIRST so we can attach
 * cookies to it. The Supabase server client's setAll callback writes to BOTH
 * the cookie store (for future requests) AND the response object (for the
 * current request), ensuring the session cookie survives the edge/CDN layer.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    try {
      const cookieStore = await cookies();

      // CREATE THE RESPONSE FIRST — without this, NextResponse.redirect()
      // at the bottom would create a fresh response that the edge can strip
      // Set-Cookie headers from. We create a placeholder response now so we
      // can attach cookies to it later.
      const redirectTarget = `${request.headers.get("origin")}${next}`;
      const response = NextResponse.redirect(redirectTarget, 302);

      // Configure the Supabase server client to persist cookies through the
      // redirect by writing to BOTH the cookie store AND the response object.
      // Without writing to the response object, Vercel/edge strips
      // Set-Cookie headers on redirect, causing the session to vanish on
      // the very next navigation.
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
                  // CRITICAL: also write to THIS SAME response object so the edge
                  // doesn't strip the Set-Cookie header. This is the difference
                  // between a working and broken auth flow on Vercel.
                  response.cookies.set(c.name, c.value, c.options as never);
                } catch {
                  // Next.js only permits cookie mutation inside Server Actions /
                  // Route Handlers. When a session refresh is attempted during a
                  // Server Component render, the write is rejected — that's fine:
                  // the read-only session stands for this render, and the next
                  // Server Action / Route Handler can persist a refreshed session.
                }
              }
            },
          },
        }
      );

      const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn("auth/callback exchange failed:", error.message);
        return NextResponse.redirect(
          new URL(`/login?error=auth-code-error&next=${encodeURIComponent(next)}`, request.url)
        );
      }
      if (authData.user) {
        await syncUserToProfiles(authData.user);
      }
      console.warn("auth/callback: exchange succeeded for", authData.user?.email);

      // Return the SAME response object with cookies attached — this is what
      // survives the Vercel/edge layer and ensures the session cookie is sent
      // to the browser on the redirect.
      return response;
    } catch (e) {
      console.warn("auth/callback exchange threw:", String(e));
      return NextResponse.redirect(
        new URL(`/login?auth=error&reason=${encodeURIComponent(String(e).slice(0, 200))}&next=${encodeURIComponent(next)}`, request.url)
      );
    }
  }

  // No code param: the browser didn't send the PKCE/session cookie; redirect
  // to login with a visible flag.
  return NextResponse.redirect(new URL(`/login?auth=no-code&next=${encodeURIComponent(next)}`, request.url));
}