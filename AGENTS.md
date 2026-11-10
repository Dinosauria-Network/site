<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repo conventions (hand-written — edit freely)

### Environment & npm scripts
- npm scripts do **not** load `.env`. Anything needing env vars must run as `NODE_OPTIONS="-r dotenv/config" npx tsx scripts/<file>.ts` (the value **must be quoted** — bare `NODE_OPTIONS=-r dotenv/config npx ...` is parsed by sh as a nonexistent `dotenv/config` command).
- Real secrets live in `.env` (gitignored): `DATABASE_URL` (Supabase transaction pooler), `JEVSTYLE_API_KEY`. The plain `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are placeholders; the `NEXT_PUBLIC_SUPABASE_*` values are real. Server-side auth is deferred on purpose (see docs/phase-status.md).
- Sign of a missing-env failure: Drizzle `password authentication failed` or the Jev-Style test printing "No JEVSTYLE_API_KEY set — skipping live test".

### Script entrypoints (names ≠ filenames)
- The `ingest:*`, `editorial:*`, `source:health`, `retraction:check` scripts point at **existing** files; the originally-named files (`scripts/editorial-generate.ts` etc.) were never created and don't exist anywhere in git history.
- Map: `ingest:europe-pmc`/`ingest:arxiv` → `scripts/ingest-db.ts` (all adapters), `ingest:all` → `scripts/run-ingestion.ts`, `editorial:generate`/`editorial:classify` → `scripts/classify-and-prune.ts`, `editorial:retry`/`source:health`/`retraction:check` → `scripts/test-jev-style.ts`. Actual logic: adapters in `lib/ingestion/`, classifier in `lib/ai/jev-style.ts`.
- **Destructive:** `classify-and-prune.ts` deletes every paper scoring `< 0.25` (limit 30 per run). `npm run editorial:generate` prunes the DB by design.

### Styles: legacy CSS + SCSS modules (duplication is intentional)
- `public/css/main.css` is legacy, intentionally de-minified for readability; it's being slowly migrated to SCSS modules (`components/`, `app/styles/`). Don't re-minify it; don't "dedupe" across the two systems.
- SCSS: use `@use "..."` with file path, not `@import` (see `app/styles/globals.scss`).
- `.main` gets a right-side reserve via `@media (width >= 1280px)` (240px) and `@media (width >= 1600px)` (25%); the hamburger toggle hides at ≥1280px. New layout rules go in modules, but verify against legacy `.main` selectors first — both apply at runtime.

### Editorial Phase 4 CLI (review surface — no admin UI)
- `npm run editorial:propose` — score papers **persisted in `research_papers.editorial_score`** (written by `editorial:classify`), create `draft` stories (≥ `--min-score`, default 0.5), issues next numeric postId = `max(DB body.sourcePostId, JSON max id) + 1`.
- `npm run editorial:pending` — list drafts (`--all` adds `pending_review`; `--json` for raw).
- `npm run editorial:attach-image -- --slug <slug> --url <url-or-path>` — real images only (Wikimedia Commons CC images work; DOI pages typically 403 to scrapers so `og:image` is usually MISSING at propose time). Cap 5 MB, writes `public/images/news/<slug>.<ext>`, records `media_assets` (`reuseStatus='pending_verification'`), auto-generates `-1024/-640/-480.jpg` derivatives via `lib/image-derivatives.ts`.
- `npm run editorial:publish -- <slug>` — hard-refuses without an existing on-disk image (no placeholders, ever); sets `status='published'` + `publication_events` row.
- `npm run editorial:reject -- <slug>` — sets `status='rejected'`.
- One story per paper: unique `stories_paper_unique` on `editorial_stories.paper_id` (0003); `research_papers.doi` is unique (0004). `drizzle-kit push` is TTY-interactive here — apply SQL manually with `pg.Pool` via tsx (raw `.sql` files in `drizzle/`), not via `push`/`generate`.
- Admin/review UI is **deferred** until server-side auth lands (Phase 1b → Phase 5). The CLI is the review surface until then; do not build an admin UI in the meantime.

### Housekeeping
- Don't commit `IMPLEMENTATION_CHECKLIST.md`, `skills-lock.json`, or `.agents/` — user request. Committing the two listed files is never desired.
- `ArticleCard.tsx` reading-time label (`< 10 min`) is hardcoded on purpose; should become computed eventually.
- Homepage news and `/news` read published `editorial_stories` from the DB (status='published', newest by publishedAt, JSON fallback only on DB error); `_data/news-posts.json` is legacy/retired, used only as a safety net for `/news/[id]` via JSON fallback.
