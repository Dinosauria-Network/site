"use server";

import { db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Set a media asset's reuseStatus. */
export async function setAssetReuseStatus(assetId: string, status: string) {
  await db.update(mediaAssets).set({ reuseStatus: status }).where(eq(mediaAssets.id, assetId));
  return { ok: true as const };
}
