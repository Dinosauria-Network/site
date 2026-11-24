import { NextResponse } from "next/server";
import { createServerClientNow } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/roles";

/** Pattern endpoint for the admin surface: returns the signed-in user + role. */
export async function GET() {
  const role = await requireRole("viewer");
  const supabase = await createServerClientNow();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ user: user ?? null, role });
}
