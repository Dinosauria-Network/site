"use client";

import { useState } from "react";
import StatusBadge from "@/components/admin/StatusBadge";

interface StoryLite {
  id: string;
  slug: string;
  headline: string;
  deck?: string | null;
  status: string;
  publishedAt: Date | null;
  updatedAt: Date | null;
}

interface ArticlesListClientProps {
  stories: StoryLite[];
  query: string;
  status: string;
  page: number;
}

const STATUSES = ["draft", "pending_review", "published", "rejected"];

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—");

export default function ArticlesListClient({ stories, query, status, page }: ArticlesListClientProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftPage, setDraftPage] = useState(page);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (draftQuery) params.set("q", draftQuery);
    if (draftStatus !== "all") params.set("status", draftStatus);
    params.set("page", "1");
    window.location.href = `/admin/articles?${params.toString()}`;
  };

  const pageParam = (p: number) => {
    const params = new URLSearchParams();
    if (draftQuery) params.set("q", draftQuery);
    if (draftStatus !== "all") params.set("status", draftStatus);
    params.set("page", String(p));
    return `/admin/articles?${params.toString()}`;
  };

  return (
    <>
    <form className="admin-field" style={{ marginBottom: "1rem" }} onSubmit={handleSubmit}>
      <input
        type="search"
        value={draftQuery}
        onChange={(e) => setDraftQuery(e.target.value)}
        placeholder="Search headlines…"
        className="admin-input"
        style={{ maxWidth: 280 }}
        aria-label="Search articles"
      />
      <select
        value={draftStatus}
        onChange={(e) => setDraftStatus(e.target.value)}
        className="admin-select"
        aria-label="Filter by status"
      >
        <option value="all">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button type="submit" className="admin-btn">Search</button>
      {(draftQuery || draftStatus !== "all") && (
        <a className="admin-btn" href="/admin/articles">Clear</a>
      )}
      <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#66594F" }}>
        Page {draftPage}
      </span>
    </form>

    <table className="admin-table">
      <thead>
        <tr>
          <th style={{ width: 60 }}>ID</th>
          <th>Headline</th>
          <th style={{ width: 110 }}>Status</th>
          <th style={{ width: 130 }}>Published</th>
          <th style={{ width: 130 }}>Updated</th>
        </tr>
      </thead>
      <tbody>
        {stories.length === 0 ? (
          <tr>
            <td colSpan={5} style={{ textAlign: "center", color: "#66594F" }}>
              No stories found.
            </td>
          </tr>
        ) : (
          stories.map((s) => (
            <tr key={s.id}>
              <td>
                <a href={`/admin/articles/${s.id}`} style={{ fontWeight: 600, color: "#4F362A" }}>
                  {s.id.slice(0, 8)}
                </a>
              </td>
              <td style={{ maxWidth: "80vw" }}>{s.headline}</td>
              <td><StatusBadge status={s.status} /></td>
              <td>{fmt(s.publishedAt)}</td>
              <td>{fmt(s.updatedAt)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    </>
  );
}
