# Scraper / Build Notes
- Source data: _data/news-posts.json, _data/genus-data.json
- Scrape: lib/article-scraper.ts (URL validation + retry + SSRF block + regex meta)
- Build-time enrichment: npm run enrich  (writes _data/enriched-cache.json)
- Tests: npm run test (not yet configured; see package.json)
