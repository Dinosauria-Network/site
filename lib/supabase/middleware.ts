import { createServerClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

/**
 * Middleware client (Phase 1b). Used by the root `middleware.ts` to refresh
 * the auth session before every request and inspect the current user.
 *
 * Use the modern `getAll`/`setAll` cookie methods (the `get`/`set`/`remove`
 * helpers are deprecated and will be removed in a future major version).
 */
export function getMiddlewareClient(
  cookieStore: {
    getAll(): { name: string; value: string }[];
    set(name: string, value: string, options?: Record<string, unknown>): any;
    delete(name: string, options?: Record<string, unknown>): any;
  }
) {
  return createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: async (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) => {
        for (const c of cookiesToSet) {
          await cookieStore.set(c.name, c.value, c.options as never);
        }
      },
    },
  });
}

/** Sign-out helper — clears session by calling `supabase.auth.signOut()` on the client. */
export function supabaseMiddleware(supabase: ReturnType<typeof getMiddlewareClient>) {
  return supabase;
}
