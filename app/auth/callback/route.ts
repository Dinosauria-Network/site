import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClientNow } from "@/lib/supabase/server";
import { syncUserToProfiles } from "@/lib/supabase/users";

/**
 * OAuth callback (Phase 1b) — exchanges the code, syncs the user to
 * user_profiles, then redirects to the post-login destination.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    try {
      const cookieStore = await cookies();
      const incomingCookies = cookieStore.getAll().map((c) => c.name);
      console.warn("auth/callback: incoming cookies:", incomingCookies.join(", ") || "(none)");
      const supabase = await createServerClientNow();
      const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn("auth/callback exchange failed:", error.message);
        return NextResponse.redirect(
          new URL(`/login?auth=failed&reason=${encodeURIComponent(error.message)}`, request.url)
        );
      }
      if (authData.user) {
        await syncUserToProfiles(authData.user);
      }
      console.warn("auth/callback: exchange succeeded for", authData.user?.email);
      // Success: redirect to admin with auth=ok so the user sees they're logged in
      return NextResponse.redirect(new URL(`/admin?auth=ok&next=${encodeURIComponent(next)}`, request.url));
    } catch (e) {
      console.warn("auth/callback exchange threw:", String(e));
      return NextResponse.redirect(
        new URL(`/login?auth=error&reason=${encodeURIComponent(String(e).slice(0, 200))}`, request.url)
      );
    }
  } else {
    console.warn("auth/callback: no code param present — cookies not reaching this host");
    // No code: the browser didn't send the PKCE/session cookie; redirect to login with visible flag
    return NextResponse.redirect(new URL(`/login?auth=no-code`, request.url));
  }
}
