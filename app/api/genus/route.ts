import { NextResponse } from "next/server";
import { getAllGenera } from "@/lib/genus-data";

export async function GET() {
  try {
    const genera = getAllGenera();
    return NextResponse.json(genera);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch genera" },
      { status: 500 }
    );
  }
}