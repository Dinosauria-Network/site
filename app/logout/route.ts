import { NextResponse } from "next/server";
import { createServerClientNow } from "@/lib/supabase/server";

/** Sign out (Phase 1b) — calls Supabase auth signOut and redirects to /login. */
export async function GET(request: Request) {
  const supabase = await createServerClientNow();
  const { error } = await supabase.auth.signOut();
  if (error) console.warn("logout error:", error);
  return NextResponse.redirect(new URL("/login", request.url));
}
