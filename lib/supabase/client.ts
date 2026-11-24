import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

/** Browser client — use in client components for sign-in / session reads. */
export function createClient() {
  return createBrowserClient(supabaseConfig.url, supabaseConfig.key);
}
