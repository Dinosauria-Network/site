import { NextResponse } from "next/server";
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
      const supabase = await createServerClientNow();
      const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && authData.user) {
        await syncUserToProfiles(authData.user);
      }
    } catch (e) {
      console.warn("auth/callback exchange failed", e);
    }
  }

  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/admin", request.url));
}
