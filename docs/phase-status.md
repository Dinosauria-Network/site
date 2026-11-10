# Phase Status

## Completed
- Phase 1 (Foundation): schema 18 tables, migrations 0000/0001, db push OK, .env DB fixed, seed categories done, client-side supabase configured, auth deferred.

## In Progress
- Editorial Phase 4 (CLI editorial pipeline, home/review surface): `editorial:propose` → draft → `editorial:pending` → `editorial:attach-image --slug <slug> --url <url>` (Wikimedia Commons/CC or local file, ≤ 5 MB; `reuseStatus='pending_verification'`) → `editorial:publish` (refuses without a real on-disk image; no placeholder images; writes `publication_events`) → `editorial:reject`. Review surface is the CLI, not a UI — admin/review UI is deferred (see Deferred).
- Detail pages `/news/[id]`: DB-first — numeric `body.sourcePostId` is shared between `editorial_stories` and the legacy JSON posts; pipeline posts (IDs 53/54/55) collide with retired JSON ids (1–68), so DB wins. `_data/news-posts.json` is legacy and only a fallback.
- Published pipeline proof: `dinosaur-metabolism` (postId=53) published via the CLI; smoke-tested propose→attach→publish end-to-end.
- Image derivatives: every image attached via pipeline scripts now ships `normalizeCardImage(storagePath)` output: base center-cropped to **1024×633 (1.618:1, `CARD_RATIO`)** + `-1024/-640/-480.jpg` derivatives at the same ratio (`lib/image-derivatives.ts`, sharp) so `ArticleCard`'s `<img width={1024} height={633}>` and `<source srcSet media>` match. **Whole `public/images/news/` tree (~297 files) normalized** — bases and tracked derivatives were center-cropped in place.
- Migrations applied **manually** (TTY-blocked `drizzle-kit push`): `drizzle/0003_editorial-score-and-story-unique.sql` (adds `research_papers.editorial_score real`, unique `stories_paper_unique` on `editorial_stories.paper_id`), `drizzle/0004_papers-doi-unique.sql` (unique constraint on `research_papers.doi`). Note: earlier commit claimed DOI unique done — it was not; 0004 is the real apply.
- Scoring backfill: all 36 papers scored (0 pruned in backfill; two 30-limit passes). Two thresholds: `editorial:classify`/prune uses keep/delete at 0.25; `editorial:propose` defaults `--min-score 0.5`.
- Pending drafts: `dinosaur-revolutions` (postId=54) and `dinosaur-teleology` (postId=55) — need images attached before publish.
- Open question: `enriched-cache.json` holds stale JSON ids 1–68 (as a fallback for og:image); unrisky once DB lookup wins, but a future cleanup could retire it.

- Phase 2 (Research ingestion): building source interface + Europe PMC / arXiv / Crossref adapters.
- Recommendations applied: interface already defined in lib/ingestion/types.ts; building one adapter at a time; using ingestionRuns / sourceCursors / paperSources.
- Status: Duplicate fix: DB unique on `research_papers.doi`, insert → `onConflictDoNothing()` (drop all pre-insert select). Tested duplicate prevention works. Schema: `drizzle/0002_cuddly_stepford_cuckoos.sql`.
- Phase 3 (AI editorial): proposed Ollama-only for generative summary; Local not deployable on Vercel — defer.
- Filtering/classification: Jev-Style adapter (`lib/ai/jev-style.ts`) wired. Tested live — calibrated probabilities returned (`0.958` neosauropod, `0.005` off-topic). Pruning script `scripts/classify-and-prune.ts` deletes papers with score `<0.25`; 11 pruned from DB.
- JSON migration (`scripts/migrate-json-stories.ts`): reads `_data/news-posts.json`, classifies with Jev-Style (`prob >= 0.25`), cleans titles (strips " | Source"), inserts to `research_papers`. Ran: 62 stories added (0 skipped). Titles cleaned.
- Recommendation applied: interface reused from existing types.ts; adapters implement discover()/normalize(); use cursor pagination; keep ingestion independent of AI/editorial.

## Deferred
- Server-side auth (Phase 1b): needed before admin/review endpoints (Phase 5) but not blocking ingestion.
- AI editorial (Phase 3): only after papers are imported.
- Admin/review UI is **deferred** until Phase 1b/5 auth lands. Until then the CLI (`editorial:pending`) is the review surface; do not build an admin UI in the meantime — Phase 4 stories are managed exclusively via the CLI above.
- Publishing engine (Phase 5): needs auth + editorial stories.
