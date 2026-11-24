"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/admin/StatusBadge";
import { setStoryStatus, updateStoryFields, deleteStory } from "@/lib/admin/articles";
import { notifySuccess, notifyError } from "@/lib/admin/notices";
import type { StoryImageStatus } from "@/lib/admin/story-image";

interface StoryFields {
  id: string;
  slug: string;
  headline: string;
  deck: string | null;
  description: string | null;
  status: string;
  publishedAt: string | null;
}

export interface EditorImage {
  src: string | null;
  referenced: string | null;
  status: StoryImageStatus;
  caption: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  credit: string | null;
  reuseStatus: string | null;
}

interface Props {
  story: StoryFields;
  image: EditorImage;
}

const REUSE_LABELS: Record<string, string> = {
  verified: "Verified",
  pending_verification: "Pending verification",
};

export default function ArticleEditor({ story, image }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [headline, setHeadline] = useState(story.headline);
  const [description, setDescription] = useState(story.description ?? "");
  const [saving, setSaving] = useState(false);
  // A path the server couldn't verify may still 404 — recover instead of showing a broken image.
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(image.src) && !imageFailed;
  const imageMissing = image.status === "missing" || imageFailed;

  const run = async (fn: () => Promise<unknown>, okMsg: string, redirectTo?: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await fn();
      setMessage(okMsg);
      notifySuccess(okMsg);
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      window.location.reload();
    } catch (e) {
      setMessage("Error: " + (e as Error)?.message);
      notifyError("Error: " + (e as Error)?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-editor-split">
      <form
        className="admin-section admin-editor-main"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Article editor"
      >
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

          {story.status !== "published" && (
            <button type="button" className="admin-btn" disabled={saving} onClick={() => { if (window.confirm("Publish this article? Published stories appear publicly.")) run(() => setStoryStatus(story.id, "published" as "draft" | "pending_review" | "published" | "rejected"), "→ publish"); }}>
              Publish
            </button>
          )}
          {story.status === "draft" && (
            <button type="button" className="admin-btn" disabled={saving} onClick={() => { if (window.confirm("Move to pending_review (shown as a draft)?")) run(() => setStoryStatus(story.id, "pending_review" as "draft" | "pending_review" | "published" | "rejected"), "→ request review"); }}>
              Request review
            </button>
          )}
          {story.status === "published" && (
            <button type="button" className="admin-btn" disabled={saving} onClick={() => { if (window.confirm("Revert to draft (hidden publicly)?")) run(() => setStoryStatus(story.id, "draft" as "draft" | "pending_review" | "published" | "rejected"), "→ unpublish to draft"); }}>
              Unpublish to draft
            </button>
          )}
        </div>

        <div className="admin-danger-zone">
          {story.status !== "published" && (
            <button type="button" className="admin-btn admin-btn-warning" disabled={saving} onClick={() => { if (window.confirm("Reject this article?")) run(() => setStoryStatus(story.id, "rejected" as "draft" | "pending_review" | "published" | "rejected"), "→ rejected"); }}>
              Reject
            </button>
          )}
          <button type="button" className="admin-btn admin-btn-danger" disabled={saving} onClick={() => { if (window.confirm(`Permanently delete "${story.headline}"? This cannot be undone.`)) run(async () => { const res = await deleteStory(story.id); if (!res.ok) throw new Error(res.error); }, "Story deleted", "/admin/articles"); }}>
            Delete story
          </button>
        </div>
        {message && <p style={{ margin: "0.75rem 0 0", color: "#2e8b57", fontSize: "0.875rem" }}>{message}</p>}
      </form>

      <aside className="admin-section admin-editor-aside" aria-labelledby="editor-image-heading">
        <h3 className="admin-section-title" id="editor-image-heading" style={{ fontSize: "1rem", marginTop: 0 }}>
          Image
        </h3>

        {hasImage ? (
          <img src={image.src!} alt={image.caption ?? ""} onError={() => setImageFailed(true)} />
        ) : (
          <p className="admin-image-meta" style={{ margin: "0 0 0.5rem" }}>
            {imageMissing ? "No readable image file." : "No image attached."}
          </p>
        )}

        {image.caption && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "#4F362A" }}>{image.caption}</p>}

        {hasImage && (
          <ul className="admin-image-meta">
            {image.licenseName && (
              <li>
                Licence:{" "}
                {image.licenseUrl ? (
                  <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer">{image.licenseName}</a>
                ) : (
                  image.licenseName
                )}
              </li>
            )}
            {image.credit && <li>Credit: {image.credit}</li>}
            {image.reuseStatus && <li>Reuse: {REUSE_LABELS[image.reuseStatus] ?? image.reuseStatus}</li>}
          </ul>
        )}

        {imageMissing && (
          <p className="admin-image-warning" role="status">
            {image.referenced ? (
              <>This story references <code>{image.referenced}</code>, but that file is not in <code>public/</code>. Readers currently get a broken image.</>
            ) : (
              <>The image could not be loaded. Readers may currently get a broken image.</>
            )}
          </p>
        )}

        {!imageMissing && !hasImage && (
          <p className="admin-image-meta" style={{ margin: "0.5rem 0 0" }}>
            Attach one with <code>npm run editorial:attach-image</code>.
          </p>
        )}
      </aside>
    </div>
  );
}
