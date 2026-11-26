import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUserToProfiles } from "@/lib/supabase/users";
import { supabaseConfig } from "@/lib/supabase/config";
import { getSafeBaseUrl, warnOnHostMismatch } from "@/lib/supabase/base-url";

export async function GET(request: Request) {
  // Redirect back to the host the browser actually used. Session cookies are
  // host-only, so bouncing from www. to the apex (or back) loses the session
  // that was just written — that was the "sign-in works, /admin says no cookie"
  // bug. See lib/supabase/base-url.ts for the precedence rules.
  const baseUrl = getSafeBaseUrl(request);
  warnOnHostMismatch(request);

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