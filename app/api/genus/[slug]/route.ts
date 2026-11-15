import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getGenusBySlug } from "@/lib/genus-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { slug } = await params;
  try {
    const genus = getGenusBySlug(slug);
    if (!genus) return NextResponse.json({ error: "Genus not found" }, { status: 404 });
    return NextResponse.json(genus);
  } catch (error) {
    console.error("[api/genus] error for slug", slug, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
