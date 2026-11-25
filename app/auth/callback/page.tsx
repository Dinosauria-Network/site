"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";

export default function CallbackPage() {
  const [sessionInitialized, setSessionInitialized] = useState(false);

  useEffect(() => {
    ;(async () => {
      // Only run once — the OAuth flow may take a microtask to fully complete
      if (sessionInitialized) return;
      setSessionInitialized(true);

      const supabase = createClient();

      // The Supabase browser client automatically detects a `code` query parameter
      // (from an OAuth return) and exchanges it for a session, setting the session
      // cookie via document.cookie. After that, we can redirect to the admin page.
      let attempts = 0;
      const maxAttempts = 15; // ~1.5 seconds total (100ms intervals)

      const check = async () => {
        attempts++;
        if (attempts > maxAttempts) {
          console.warn("callback: max attempts reached without session");
          redirect(`/login?next=/admin&reason=session-timeout`);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          // Still no session — check again later
          setTimeout(check, 100);
          return;
        }

        // Session is now established and stable in the browser. Redirect to the
        // intended destination with auth=ok so admin routes know the user is logged in.
        const next = "/admin";
        const url = new URL(next, window.location.href);
        url.searchParams.set("auth", "ok");
        window.location.href = url.href;
      };

      check();
    })();
  }, [sessionInitialized]);

  // During the initial mount, render null so Next.js doesn't render extra UI.
  // The useEffect will handle the redirect asynchronously.
  return null;
}