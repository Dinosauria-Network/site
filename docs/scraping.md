# Scraping & Ingestion

Current state (post-pipeline): dinosauria.net's news corpus is built from the
**ingest pipeline** writing to Postgres, not from the retired JSON scraper.

## Primary path — automated ingest (recommended)

```bash
npm run ingest:rss        # non-journal outlets (blogs, NSF/USGS, press) → research_papers
npm run ingest:journals   # watched journals (latest 10 each) via Crossref
npm run ingest:europe-pmc # open-access corpus via Europe PMC
npm run ingest:crossref   # keyword sweep via Crossref
npm run ingest:check      # discover() smoke test (read-only)
npm run editorial:classify  # score unscored papers (Jev-Style)
npm run editorial:propose   # score >= 0.5 → draft stories
npm run editorial:autopublish -- --dry-run  # preview the publish gate
npm run editorial:status    # corpus summary
```

Daily GitHub workflow: `.github/workflows/news.yml` (currently disabled pending user decision).

## Article enrichment scraper (legacy but live)

`lib/article-scraper.ts` — URL validation + retry + SSRF block + regex meta
extraction. Used to enrich posts at build time with OG title/description/image:

```bash
npm run enrich            # rewrites _data/enriched-cache.json
```

`npm run scrape` (`scripts/auto-scrape.mjs`) is the legacy one-off RSS→JSON
scraper. It writes to the retired `_data/news-posts.json` and is superseded by
the pipeline above; keep it only for backfills.

## Cross-references

- Source data (legacy): `_data/news-posts.json`, `_data/genus-data.json`
- Pipeline code: `lib/ingestion/`, `scripts/ingest-db.ts`, `scripts/propose.ts`
- Postgres schema/migrations: `lib/db/schema.ts`, `drizzle/`
