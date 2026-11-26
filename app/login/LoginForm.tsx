"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export function LoginForm({ notice }: { notice?: { tone: "error" | "info"; text: string } }) {
  const [provider, setProvider] = useState<"google" | "github" | null>(null);
  const supabase = createClient();

  const handleSignIn = async (p: "google" | "github") => {
    setProvider(p);
    await supabase.auth.signInWithOAuth({
      provider: p,
      options: {
        // Absolute, query-string-free redirect URL.
        //
        // Query strings are the reason this flow kept landing on the site root
        // with `?code=...` instead of reaching /auth/callback: Supabase matches
        // `redirectTo` against the project's redirect allowlist, and a URL with
        // a query string does not match an allowlist entry without one. It then
        // falls back to the project's Site URL and the code is dropped on a
        // page that cannot exchange it. `next` therefore defaults to /admin in
        // the callback rather than travelling in the URL.
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { provider: p },
      },
    });
  };

  return (
    <div className="login-card">
      <p className="login-brand">{SITE_NAME}</p>
      <h1 className="login-card-title">Sign in to the Admin</h1>
      <p className="login-brand-tagline">{SITE_TAGLINE}</p>

      {notice ? (
        <p className={`login-notice login-notice-${notice.tone}`} role="alert">
          {notice.text}
        </p>
      ) : (
        <p className="login-card-note">Use Google or GitHub to continue.</p>
      )}

      <button type="button" className="login-btn" onClick={() => handleSignIn("google")} disabled={!!provider}>
        {provider === "google" ? "Signing in with Google…" : "Continue with Google"}
      </button>
      <button type="button" className="login-btn login-btn-secondary" onClick={() => handleSignIn("github")} disabled={!!provider}>
        {provider === "github" ? "Signing in with GitHub…" : "Continue with GitHub"}
      </button>
      <p className="login-card-foot">Staff accounts only — sign-in required.</p>
    </div>
  );
}
