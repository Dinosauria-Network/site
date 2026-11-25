"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";

export default function CallbackPage() {
  useEffect(() => {
    ;(async () => {
      const supabase = createClient();

      // The Supabase browser client automatically detects a `code` query parameter
      // (from an OAuth return) and exchanges it for a session, setting the session
      // cookie via document.cookie. After that, we can redirect to the admin page.
      const { error } = await supabase.auth.getSession();

      if (error) {
        // No session yet — the client might still be processing the OAuth callback.
        // Wait a moment and check again, or just redirect.
        console.warn("callback: error getting session:", error.message);
      }

      // Check if we now have a session after the client processed the callback
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        // Still no session — redirect to login
        console.warn("callback: no session after OAuth callback handling");
        redirect("/login?next=/admin");
        return;
      }

      // Session is now established in the browser. Redirect to admin with auth=ok
      // so the admin routes know the user is authenticated.
      redirect("/admin?auth=ok");
    })();
  }, []);

  // During the initial mount, show nothing — the useEffect will handle the redirect.
  // If for some reason the effect doesn't redirect (e.g., no code param), fall through.
  return null;
}