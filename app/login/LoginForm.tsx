"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [provider, setProvider] = useState<"google" | "github" | null>(null);
  const supabase = createClient();

  const handleSignIn = async (p: "google" | "github") => {
    setProvider(p);
    await supabase.auth.signInWithOAuth({
      provider: p,
      options: {
        redirectTo: "/auth/callback?next=/admin",
        queryParams: { provider: p },
      },
    });
  };

  return (
    <div>
      <h1>Sign in to Dinosauria Admin</h1>
      <p>Use Google or GitHub to continue.</p>
      <button type="button" onClick={() => handleSignIn("google")} disabled={!!provider}>
        {provider === "google" ? "Signing in with Google…" : "Continue with Google"}
      </button>
      <button type="button" onClick={() => handleSignIn("github")} disabled={!!provider}>
        {provider === "github" ? "Signing in with GitHub…" : "Continue with GitHub"}
      </button>
    </div>
  );
}
