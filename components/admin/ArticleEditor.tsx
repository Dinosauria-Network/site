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

import { setStoryStatus, updateStoryFields, deleteStory } from "@/lib/admin/articles";
import { notifySuccess, notifyError } from "@/lib/admin/notices";

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
      notifySuccess(okMsg);
      window.location.reload();
    } catch (e) {
      setMessage("Error: " + (e as Error)?.message);
      notifyError("Error: " + (e as Error)?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-section" onSubmit={(e) => e.preventDefault()} style={{ maxWidth: "720px" }} aria-label="Article editor">
      <div className="admin-field">
        <label className="admin-field-label" htmlFor="slug">Slug</label>
        <input id="slug" className="admin-input" defaultValue={story.slug} readOnly />
      </div>
      <div className="admin-field">
        <label className="admin-field-label" htmlFor="headline">Headline</label>
        <input id="headline" className="admin-input" value={headline} onChange={(e) => setHeadline(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-field-label" htmlFor="description">Description / deck</label>
        <textarea id="description" className="admin-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <fieldset className="admin-field">
        <legend className="admin-field-label">Status</legend>
        <span style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <StatusBadge status={story.status} />
          {story.publishedAt && <span style={{ fontSize: "0.75rem", color: "#66594F" }}>Published: {new Date(story.publishedAt).toLocaleString("en-US")}</span>}
        </span>
      </fieldset>
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
        <button
          type="button"
          className="admin-btn admin-btn-danger"
          onClick={() => {
            if (!window.confirm(`Permanently delete "${story.headline}"? This cannot be undone.`)) return;
            run(() => deleteStory(story.id), "Story deleted");
          }}
        >
          Delete story
        </button>
      </div>
      {message && <p style={{ margin: "0.75rem 0 0", color: "#2e8b57", fontSize: "0.875rem" }}>{message}</p>}
    </form>
  );
}
