"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/admin/StatusBadge";
import { setStoryStatus, updateStoryFields, deleteStory } from "@/lib/admin/articles";
import { attachStoryImage, clearStoryImage } from "@/lib/admin/images";
import { notifySuccess, notifyError } from "@/lib/admin/notices";
import type { StoryImageStatus } from "@/lib/admin/story-image";

interface StoryFields {
  id: string;
  slug: string;
  headline: string;
  deck: string | null;
  description: string | null;
  status: string;
  source: string | null;
  originalUrl: string | null;
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
  const [imageUrl, setImageUrl] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageMsg, setImageMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const attachImage = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file && !imageUrl.trim()) {
      setImageMsg({ tone: "error", text: "Paste an image URL or choose a file." });
      return;
    }
    setImageBusy(true);
    setImageMsg(null);
    try {
      const fd = new FormData();
      fd.set("storyId", story.id);
      if (file) fd.set("file", file);
      else fd.set("url", imageUrl.trim());
      const res = await attachStoryImage(fd);
      if (!res.ok) throw new Error(res.error);
      setImageMsg({ tone: "ok", text: `Attached ${res.storagePath}. Licence is pending verification.` });
      notifySuccess("Image attached");
      setImageUrl("");
      if (fileRef.current) fileRef.current.value = "";
      setImageFailed(false);
      router.refresh();
    } catch (err) {
      const text = (err as Error)?.message || "Could not attach that image";
      setImageMsg({ tone: "error", text });
      notifyError(text);
    } finally {
      setImageBusy(false);
    }
  };

  const clearImage = async () => {
    if (!window.confirm("Remove this story's image reference? The file stays on disk.")) return;
    setImageBusy(true);
    setImageMsg(null);
    try {
      const res = await clearStoryImage(story.id);
      if (!res.ok) throw new Error(res.error);
      setImageFailed(false);
      notifySuccess("Image reference cleared");
      router.refresh();
    } catch (err) {
      const text = (err as Error)?.message || "Could not clear the image reference";
      setImageMsg({ tone: "error", text });
      notifyError(text);
    } finally {
      setImageBusy(false);
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
        <div className="admin-field">
          <label className="admin-field-label" htmlFor="source">Source</label>
          <input id="source" className="admin-input" value={story.source ?? ""} readOnly />
        </div>
        <div className="admin-field">
          <label className="admin-field-label" htmlFor="original-article">Original article</label>
          <input id="original-article" className="admin-input" type="url" value={story.originalUrl ?? ""} readOnly />
          {story.originalUrl && (
            <a className="admin-btn" href={story.originalUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: "0.5rem" }}>
              Open original article ↗
            </a>
          )}
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

        {imageMissing && (
          <button type="button" className="admin-btn" disabled={imageBusy} onClick={clearImage}>
            Clear image reference
          </button>
        )}

        <form className="admin-image-attach" onSubmit={attachImage}>
          <label className="admin-field-label" htmlFor="image-url">
            {hasImage ? "Replace image" : "Attach image"}
          </label>
          <input
            id="image-url"
            type="url"
            className="admin-input"
            placeholder="https://commons.wikimedia.org/…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={imageBusy}
          />
          <label className="admin-field-label" htmlFor="image-file">or choose a file</label>
          <input
            id="image-file"
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="admin-file"
            disabled={imageBusy}
          />
          <button type="submit" className="admin-btn admin-btn-primary" disabled={imageBusy}>
            {imageBusy ? "Attaching…" : "Attach"}
          </button>
          <p className="admin-image-meta" style={{ margin: "0.35rem 0 0" }}>
            Saved as <code>{story.slug}.&lt;ext&gt;</code>, cropped to 1024×633, licence left as pending verification.
          </p>
          {imageMsg && (
            <p className={imageMsg.tone === "ok" ? "admin-image-ok" : "admin-image-error"} role="status">
              {imageMsg.text}
            </p>
          )}
        </form>
      </aside>
    </div>
  );
}
