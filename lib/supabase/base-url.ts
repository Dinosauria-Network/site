/**
 * The one place that decides which origin an auth redirect points at.
 *
 * Order matters, and it is the opposite of the intuitive one:
 *
 *   1. the host the browser actually used (x-forwarded-host / host)
 *   2. NEXT_PUBLIC_SITE_URL
 *   3. request.url's origin
 *   4. VERCEL_URL
 *   5. localhost
 *
 * Session cookies from @supabase/ssr are host-only (no `Domain` attribute), so
 * a redirect from `www.example.com` to `example.com` silently drops them and
 * the next request looks logged-out. Preferring a configured env var over the
 * incoming host is therefore an auth bug waiting to happen: it was the cause of
 * "sign-in succeeds, then /admin says no-auth-cookie" on this site, where
 * NEXT_PUBLIC_SITE_URL was the apex and the site serves from `www.`.
 *
 * Used by both the OAuth callback (Node runtime) and the proxy (edge runtime),
 * so it must stay dependency-free.
 */
export function getSafeBaseUrl(request: {
  url: string;
  headers: Headers;
}): string {
  const firstValue = (raw: string | null): string | null => {
    if (!raw) return null;
    const first = raw.split(",")[0]?.trim();
    return first || null;
  };

  const host = firstValue(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  );
  const proto =
    firstValue(request.headers.get("x-forwarded-proto")) ??
    (host && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");

  // 1. Same host the browser is already on — keeps host-only cookies valid.
  if (host) {
    return `${proto}://${host}`;
  }

  // 2. Configured site URL, only when there is no host header to trust.
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  // 3. request.url, but only if its origin is a real http(s) URL (not "null").
  try {
    const origin = new URL(request.url).origin;
    if (origin && origin !== "null" && origin.startsWith("http")) {
      return origin;
    }
  } catch {
    // ignore — malformed request.url
  }

  // 4. Vercel's system URL for the deployment.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

/**
 * Warn when the request host and NEXT_PUBLIC_SITE_URL disagree. Not fatal —
 * the request host wins — but it is usually a misconfiguration, and on Vercel
 * it is the difference between a cookie that sticks and one that vanishes.
 */
export function warnOnHostMismatch(request: {
  url: string;
  headers: Headers;
}): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!configured || !host) return null;

  try {
    const configuredHost = new URL(configured).host;
    if (configuredHost !== host) {
      const message =
        `auth: NEXT_PUBLIC_SITE_URL host (${configuredHost}) does not match the ` +
        `request host (${host}). Using ${host} so the session cookie stays valid; ` +
        `set NEXT_PUBLIC_SITE_URL to https://${host} to silence this.`;
      console.warn(message);
      return message;
    }
  } catch {
    // ignore — invalid env value
  }
  return null;
}
