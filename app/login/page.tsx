import { LoginForm } from "./LoginForm";

/**
 * /login — the review surface's front door.
 *
 * Every layer that bounces a user here stamps a `diagnostic` so the card can
 * explain *which* one failed instead of showing a bare form that appears to do
 * nothing:
 *   proxy.ts            → no-cookie | invalid-session | getuser-error
 *   lib/supabase/roles  → rsc-no-session | getuser-error | no-profile
 *   auth/callback       → auth=error | error=auth-code-error | auth=no-code
 */
type Search = Record<string, string | string[] | undefined>;

const MESSAGES: Record<string, { tone: "error" | "info"; text: string }> = {
  "no-cookie": {
    tone: "error",
    text:
      "Sign-in completed, but your browser sent no session cookie back to the server. Clear this site's cookies, then sign in again. Still stuck? Open /api/debug/auth and check the verdict.",
  },
  "invalid-session": {
    tone: "error",
    text:
      "A session cookie arrived but the sign-in service rejected it (usually expired). Sign in again to get a fresh one.",
  },
  "getuser-error": {
    tone: "error",
    text:
      "Your session cookie arrived, but the sign-in service could not verify it. This is a connection problem, not a cookie problem — try again in a moment.",
  },
  "rsc-no-session": {
    tone: "error",
    text:
      "The admin page could not see a signed-in session. Clear this site's cookies and sign in again.",
  },
  "no-profile": {
    tone: "error",
    text:
      "You are signed in, but this account has no staff profile, so it has no admin role. Ask an admin to add your email to user_profiles. Signing in again will not change this.",
  },
  "no-code": {
    tone: "error",
    text:
      "The sign-in provider did not return an authorization code. Start the sign-in again.",
  },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const diagnostic = first(params.diagnostic);
  const detail = first(params.detail);
  const auth = first(params.auth);
  const error = first(params.error);

  let notice = diagnostic ? MESSAGES[diagnostic] : undefined;

  if (!notice && auth === "error") {
    notice = {
      tone: "error",
      text: detail
        ? `Sign-in failed: ${detail}`
        : "Sign-in failed before a session could be created. Try again.",
    };
  }

  if (!notice && auth === "no-code") {
    notice = MESSAGES["no-code"];
  }

  if (!notice && error === "auth-code-error") {
    notice = {
      tone: "error",
      text:
        "The sign-in service rejected the authorization code (it may have already been used, or it expired). Sign in again.",
    };
  }

  return <LoginForm notice={notice} />;
}
