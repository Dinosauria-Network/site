"use client";

import { useState } from "react";
import StatusBadge from "@/components/admin/StatusBadge";

interface StoryFields {
  id: string;
  slug: string;
  headline: string;
  deck: string | null;
  description: string | null;
  status: string;
  publishedAt: string | null;
}

const STATUS_OPTIONS: { value: string; label: string; confirm?: string }[] = [
  { value: "published", label: "Publish", confirm: "Publish this article? Published stories appear publicly." },
  { value: "pending_review", label: "Request review", confirm: "Move to pending_review (shown as a draft)?" },
  { value: "rejected", label: "Reject" },
  { value: "draft", label: "Unpublish to draft", confirm: "Revert to draft (hidden publicly)?" },
];

import { setStoryStatus, updateStoryFields } from "@/lib/admin/articles";

interface Props {
  story: StoryFields;
}

export default function ArticleEditor({ story }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [headline, setHeadline] = useState(story.headline);
  const [description, setDescription] = useState(story.description ?? "");
  const [saving, setSaving] = useState(false);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await fn();
      setMessage(okMsg);
      window.location.reload();
    } catch (e) {
      setMessage("Error: " + (e as Error)?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-section" onSubmit={(e) => e.preventDefault()} style={{ maxWidth: "720px" }}>
      <div className="admin-field">
        <label className="admin-field-label" htmlFor="slug">Slug</label>
        <input id="slug" className="admin-input" defaultValue={story.slug} readOnly aria-label="Slug" />
      </div>
      <div className="admin-field">
        <label className="admin-field-label" htmlFor="headline">Headline</label>
        <input id="headline" className="admin-input" value={headline} onChange={(e) => setHeadline(e.target.value)} aria-label="Headline" />
      </div>
      <div className="admin-field">
        <label className="admin-field-label" htmlFor="description">Description / deck</label>
        <textarea id="description" className="admin-textarea" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">Status</label>
        <span style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <StatusBadge status={story.status} />
          {story.publishedAt && <span style={{ fontSize: "0.75rem", color: "#66594F" }}>Published: {new Date(story.publishedAt).toLocaleString("en-US")}</span>}
        </span>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => run(() => updateStoryFields(story.id, { headline, description }), "Saved")}>
          Save changes
        </button>
        <span style={{ color: "#66594F", fontSize: "0.875rem" }}>Status actions:</span>
        {STATUS_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={o.value === "published" || o.value === "rejected" ? "admin-btn admin-btn-danger" : "admin-btn"}
            onClick={() => {
              if (o.confirm && !window.confirm(o.confirm)) return;
              run(() => setStoryStatus(story.id, o.value as "draft" | "pending_review" | "published" | "rejected"), `→ ${o.label.toLowerCase()}`);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {message && <p style={{ margin: "0.75rem 0 0", color: "#2e8b57", fontSize: "0.875rem" }}>{message}</p>}
    </form>
  );
}
