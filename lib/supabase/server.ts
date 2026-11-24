import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

/**
 * Server client — use in server components and route handlers. Reads/writes
 * the auth session via cookies through Supabase SSR. Always create a new
 * client per request (lazy session init); never share one across requests.
 */
export async function createServerClientNow() {
  const cookieStore = await cookies();
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
