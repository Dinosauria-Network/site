"use client";

import { useEffect, useState } from "react";
import { subscribeNotices, getNotices } from "@/lib/admin/notices";

const LEVEL_STYLE: Record<string, React.CSSProperties> = {
  success: { borderColor: "#2E8B57", background: "#EEF7F0" },
  error: { borderColor: "#B90A09", background: "#FBE9E9" },
  info: { borderColor: "#A9A397", background: "#F0EFEA" },
};

/** Fixed-position toast stack (Phase 5). Top-right, short auto-dismiss. */
export default function AdminToasts() {
  const [, setRevision] = useState(0);
  useEffect(() => subscribeNotices(() => setRevision((r) => r + 1)), []);
  const items = getNotices();

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "0.5rem",
        right: "0.75rem",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        maxWidth: "360px",
      }}
      role="status"
      aria-label="Notifications"
    >
      {items.map((n) => (
        <div key={n.id} style={{ border: "1px solid #000", background: "#fff", padding: "0.5rem 0.75rem", fontSize: "0.875rem", ...LEVEL_STYLE[n.level] }}>
          {n.message}
        </div>
      ))}
    </div>
  );
}
