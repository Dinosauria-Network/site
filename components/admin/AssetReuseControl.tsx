"use client";

import { useState } from "react";
import StatusBadge from "@/components/admin/StatusBadge";
import { setAssetReuseStatus } from "@/lib/admin/assets";
import { notifySuccess } from "@/lib/admin/notices";

interface Props {
  assetId: string;
  status: string;
}

/** Reuse-status toggle for images (verified / pending) — Phase 5. */
export default function AssetReuseControl({ assetId, status }: Props) {
  const [pending, setPending] = useState(status);
  const [busy, setBusy] = useState(false);

  const set = async (next: string) => {
    setBusy(true);
    await setAssetReuseStatus(assetId, next);
    setPending(next);
    setBusy(false);
    notifySuccess(`Asset marked ${next}.`);
  };

  return (
    <>
      <StatusBadge status={pending} />
      <button className="admin-btn" style={{ marginLeft: "0.5rem", fontSize: "0.75rem" }} disabled={busy} onClick={() => set("verified")}>
        Mark verified
      </button>
      <button className="admin-btn" style={{ fontSize: "0.75rem" }} disabled={busy} onClick={() => set("pending_verification")}>
        Mark pending
      </button>
    </>
  );
}
