import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUserToProfiles } from "@/lib/supabase/users";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Safely construct the base URL for redirect URLs.
 * Prevents "null" origin issues when request.url lacks a valid scheme/host.
 * Fallback chain: NEXT_PUBLIC_SITE_URL env var → x-forwarded-host/host headers
 * → request.url origin (if valid http(s)) → VERCEL_URL env var → localhost.
 */
function getSafeBaseUrl(request: Request): string {
  // 1. Prefer an explicit site URL env var if configured (e.g., https://yourdomain.com)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  // 2. Check Vercel/proxy headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  // 3. Fallback to request.url only if its origin is a real http(s) URL (not "null")
  try {
    const parsedOrigin = new URL(request.url).origin;
    if (parsedOrigin && parsedOrigin !== "null" && parsedOrigin.startsWith("http")) {
      return parsedOrigin;
    }
  } catch {
    // ignore
  }

  // 4. Last-resort Vercel system env var
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export async function GET(request: Request) {
  // Use a safe base URL for constructing redirect URLs — avoid "null" origin
  // when request.url doesn't have a valid scheme/host.
  const baseUrl = getSafeBaseUrl(request);

  const { searchParams } = new URL(request.url, "http://localhost");
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    try {
      const cookieStore = await cookies();

      // Normalize next to an absolute path starting with /
      const safeNext = next.startsWith("/") ? next : "/admin";

      // Construct redirect URLs using the safe base URL so they always have
      // a valid scheme/host, even if the incoming request.url origin is "null".
      const redirectUrl = new URL(safeNext, baseUrl);
      redirectUrl.searchParams.set("auth", "ok");

      // Create the redirect response FIRST so we can attach cookies to it
      const response = NextResponse.redirect(redirectUrl);

      const supabase = createServerClient(
        supabaseConfig.url,
        supabaseConfig.key,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cookiesToSet) => {
              for (const { name, value, options } of cookiesToSet) {
                try {
                  cookieStore.set(name, value, options);
                } catch {
                  // Ignore if called in a read-only context
                }
                response.cookies.set(name, value, options);
              }
            },
          },
        }
      );

      const { data: authData, error } =
        await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.warn("auth/callback exchange failed:", error.message);
        return NextResponse.redirect(
          new URL(
            `/login?error=auth-code-error&next=${encodeURIComponent(safeNext)}`,
            baseUrl
          )
        );
      }

      if (authData.user) {
        await syncUserToProfiles(authData.user);
      }

      return response;
    } catch (e) {
      console.warn("auth/callback exchange threw:", String(e));
      return NextResponse.redirect(
        new URL(
          `/login?auth=error&reason=${encodeURIComponent(
            String(e).slice(0, 200)
          )}&next=${encodeURIComponent(next)}`,
          baseUrl
        )
      );
    }
  }

  return NextResponse.redirect(
    new URL(`/login?auth=no-code&next=${encodeURIComponent(next)}`, baseUrl)
  );
}