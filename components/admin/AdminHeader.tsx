import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/** Compact editorial admin header (site name + tagline). */
export default function AdminHeader() {
  return (
    <header className="admin-header">
      <h1 className="admin-brand">{SITE_NAME}</h1>
      <span className="admin-brand-tag">{SITE_TAGLINE} · administration</span>
    </header>
  );
}
