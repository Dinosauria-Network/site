import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAllGenera } from "@/lib/genus-data";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const genera = getAllGenera();
    return NextResponse.json(genera);
  } catch (error) {
    console.error("[api/genus] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch genera" },
      { status: 500 }
    );
  }
}