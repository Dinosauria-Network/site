# Dinosauria Network

Dinosauria Network — a paleontology news and reference site focused on non-avian dinosaur science and related archosaur/reptile research. Live at **https://dinosauria.net**.

## Stack

- **Next.js 16** (App Router), React 19, TypeScript 5
- **PostgreSQL** (Supabase / transaction pooler) via **Drizzle ORM**
- **pg** (not supabase-js) for DB access; server-side auth deferred (see `docs/phase-status.md`)
- **Tailwind 4** + SCSS modules (global legacy styles in `public/css/main.css`, migrating to `*.module.scss`)
- Static export via **ISR** (`revalidate = 3600` on news pages)

## Setup

```bash
cp .env.example .env
npm install
npm run dev      # https://localhost:3000
```

`.env` is gitignored and holds real secrets (`DATABASE_URL` — Supabase transaction pooler, `JEVSTYLE_API_KEY`, `ELSEVIER_API_KEY`, `GROQ_API_KEY`). Client-side auth is intentionally deferred; the site is read-only at the server layer.

## Build

```bash
npm run build
npm start
```

## Architecture

### Data layer
- News stories: `editorial_stories` table, served by `lib/db/stories.ts` (DB-first). `_data/news-posts.json` is legacy / fallback only.
- Genera: static JSON `_data/genus-data.json`.

### Ingestion (`lib/ingestion/`)
| Adapter | CLI |
| --- | --- |
| Crossref keyword | `ingest:crossref` / `ingest:europe-pmc` / `ingest:arxiv` |
| Crossref watched journals (20 ISSN-verified) | `ingest:journals` |
| RSS (non-journal outlets: Burke Museum, Archosaur Musings, SVPOW, Sauropoda blog, Tetrapod Zoology, Scientific American, NSF, USGS, NCYT) | `ingest:rss` |
| Abstract enrich (OpenAlex → Crossref → Semantic Scholar → Elsevier) | in-pipeline / `backfill:abstracts` |

Dedup runs before the per-adapter `--limit` cap, so re-runs walk forward through new issues rather than re-importing duplicates.

### Editorial pipeline (review via CLI, no admin UI)
- **Classify**: `editorial:classify` → Jev-Style score in `research_papers.editorial_score`
- **Propose**: `editorial:propose` → creates draft stories for papers published on/after `--since`
- **Review**: `editorial:pending`, `editorial:status`
- **Image**: `editorial:attach-image` (Commons CC-only, or local file; sharp-validates, center-crops to 1024×633)
- **Publish**: `editorial:publish -- <slug>` (manual) or `editorial:autopublish` (gate: score ≥ 0.75 + machine-known CC licence + image + no errata)
- **Reject / Unpublish**: `editorial:reject`, `editorial:unpublish`

Reuse is tracked in `media_assets` (`reuse_status`: `pending_verification` → `verified`). Nothing auto-flips to `verified`.

### Routes
`/` · `/news`, `/news/[id]` · `/genera` · `/genus/[slug]` · `/mesozoic` · `/phylogeny` · `/search` · `/about` · `/how-many-dinosaurs-are-there`

### Preview mode
`?preview` (dev only) includes draft stories in `/news` feeds and enables click-through. Disabled in production — drafts are never reachable via query params in a prod build.

## Automation
`.github/workflows/news.yml` — daily 06:15 UTC cron (`workflow_dispatch` also supported), **never on push**: ingest → classify → propose → autopublish → status, then updates a pinned "News pipeline digest" issue. **Not yet enabled**: needs `DATABASE_URL`, `JEVSTYLE_API_KEY`, `ELSEVIER_API_KEY` in repo secrets; writes to the same production DB the site serves. Enabling is a deliberate action.

## Docs & conventions

- `docs/phase-status.md` — current state & decisions (authoritative; the implementation checklist is outdated)
- `AGENTS.md` — agent/harness instructions, env quirks, never-commit list
- `IMPLEMENTATION_CHECKLIST.md` — historical, do not commit
- News images must be 1024×633 (1.618:1); stored in `public/images/news/`

## Known limitations
- Server-side auth deferred (Phase 1b) — admin/edit UI does not exist yet
- Abstracts often missing from Elsevier/T&F Crossref deposits; resolver returns `not-deposited` / `publisher-access-unavailable`
- Autopublish does not verify images; human flip `pending_verification → verified` required
- ISR caches news pages for 1 hour after publish
