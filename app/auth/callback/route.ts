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
 * on redirect, which was causing the session cookie to disappear on navigation.
 *
 * The key pattern: create the redirect response FIRST, then configure the
 * Supabase server client to write cookies both to the cookie store AND to
 * the response object, ensuring the session cookie survives the redirect.
 */
export async function GET(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const cookieStore = await cookies();

    // Create the redirect response FIRST so we can attach cookies to it.
    // Without this, Next.js drops Set-Cookie headers on redirect at the edge.
    const response = NextResponse.redirect(`${origin}${next}`, 302);

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
                await cookieStore.set(c.name, c.value, c.options as never);
                // Explicitly attach the cookie to the redirect response so the
                // edge doesn't strip it. This is the critical fix for Vercel/
                // edge Set-Cookie dropping.
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
        new URL(`${origin}/login?error=auth-code-error`, request.url)
      );
    }
    if (authData.user) {
      await syncUserToProfiles(authData.user);
    }
    console.warn("auth/callback: exchange succeeded for", authData.user?.email);

    return response;
  }

  // No code param: the browser didn't send the PKCE/session cookie; redirect
  // to login with a visible flag.
  return NextResponse.redirect(new URL(`${origin}/login?auth=no-code`, request.url));
}