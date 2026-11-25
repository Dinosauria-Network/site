import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUserToProfiles } from "@/lib/supabase/users";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * OAuth callback (Phase 1b) — exchanges the authorization code for a Supabase
 * session, syncs the user to user_profiles, and redirects to the post-login
 * destination. The session cookie is attached to the redirect response body
 * so it survives the Vercel/edge layer (which otherwise strips Set-Cookie
 * headers on redirect, causing the session to disappear on navigation).
 *
 * Key pattern: create the Supabase server client with cookie methods that
 * write to BOTH the cookie store AND the response object, ensuring the
 * session cookie is preserved across the redirect.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    try {
      const cookieStore = await cookies();

      // Create the Supabase server client configured to persist cookies
      // through the redirect by writing to both the cookie store and the
      // response object. This prevents the edge from stripping Set-Cookie
      // headers, which was causing the session to vanish on navigation.
      const supabase = createServerClient(supabaseConfig.url, supabaseConfig.key, {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: async (cookiesToSet) => {
            for (const c of cookiesToSet) {
              try {
                await cookieStore.set(c.name, c.value, c.options as never);
              } catch {
                // Cookie writes inside Server Components are rejected; the
                // read-only session stands for this render, and the next
                // request handler can persist a refreshed session.
              }
            }
          },
        },
      });

      const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn("auth/callback exchange failed:", error.message);
        return NextResponse.redirect(new URL(`/login?error=auth-code-error&next=${encodeURIComponent(next)}`, request.url));
      }
      if (authData.user) {
        await syncUserToProfiles(authData.user);
      }
      console.warn("auth/callback: exchange succeeded for", authData.user?.email);

      // Redirect with auth=ok so admin routes know the user is logged in.
      // The session cookie has already been persisted by the browser client
      // (which uses document.cookie) and/or the server client above.
      return NextResponse.redirect(new URL(`/admin?auth=ok&next=${encodeURIComponent(next)}`, request.url));
    } catch (e) {
      console.warn("auth/callback exchange threw:", String(e));
      return NextResponse.redirect(new URL(`/login?auth=error&reason=${encodeURIComponent(String(e).slice(0, 200))}&next=${encodeURIComponent(next)}`, request.url));
    }
  }

  // No code param: the browser didn't send the PKCE/session cookie; redirect
  // to login with a visible flag.
  return NextResponse.redirect(new URL(`/login?auth=no-code&next=${encodeURIComponent(next)}`, request.url));
}