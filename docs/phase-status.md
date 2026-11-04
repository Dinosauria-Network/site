# Phase Status

## Completed
- Phase 1 (Foundation): schema 18 tables, migrations 0000/0001, db push OK, .env DB fixed, seed categories done, client-side supabase configured, auth deferred.

## In Progress
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
- Publishing engine (Phase 5): needs auth + editorial stories.
