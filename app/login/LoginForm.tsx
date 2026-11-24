"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export function LoginForm() {
  const [provider, setProvider] = useState<"google" | "github" | null>(null);
  const supabase = createClient();

  const handleSignIn = async (p: "google" | "github") => {
    setProvider(p);
    await supabase.auth.signInWithOAuth({
      provider: p,
      options: {
        // Absolute redirect URL — required for a deterministic post-auth landing
        // (relative `redirectTo` values have been observed resolving to the site
        // root, which is how users ended up on `/?code=...` instead of the callback).
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
        queryParams: { provider: p },
      },
    });
  };

  return (
    <div className="login-card">
      <p className="login-brand">{SITE_NAME}</p>
      <h1 className="login-card-title">Sign in to the Admin</h1>
      <p className="login-brand-tagline">{SITE_TAGLINE}</p>
      <p className="login-card-note">Use Google or GitHub to continue.</p>
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
