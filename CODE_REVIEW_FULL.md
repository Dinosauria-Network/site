# Dinosauria-Network/site — Multi-Perspective Code Review (Single Mode)

**Site reviewed:** `/Users/alex/Sites/Dinosauria-Network/site` (Next.js)  
**Parity reference:** `~/Sites/recovery/current` (WordPress/Roots)  
**Mode:** Single (findings aggregated; no fixes applied)  
**Review team launched:** correctness, security, architecture, conventions, simplicity, product-ux-accessibility, performance-reliability, telemetry-observability, api-compatibility, documentation-dx

---

## 🔴 Critical

### 1. Build crash — missing import breaks static generation (`app/news/[id]/page.tsx`)
- **Line:** 24 (`generateStaticParams`) references `getAllPosts()` which is **not imported** (line 1 only imports `getEnrichedPostById`, `getSourceFavicon`, `formatTimeAgo`).
- **Impact:** `ReferenceError` at `next build`; route fails entirely.
- **Fix:** Add `getAllPosts` import or remove `generateStaticParams`.

### 2. Silent data-layer crash (`lib/genus-data.ts`)
- **Line:** 74–79 (`loadData()`) does `fs.readFileSync(DATA_PATH)` with no `try/catch`. If `_data/genus-data.json` is missing, server crashes at startup for every page using `getSiteMetadata()` / `getAllGenera()`.
- **Fix:** Wrap in `try/catch` with empty-data fallback.

### 3. Broken meta regex (`lib/article-scraper.ts` + `lib/genus-data.ts` duplication)
- **Lines:** `article-scraper.ts`: 53–63; `genus-data.ts`: 324–331 (`getMeta`).
- Regex concatenates `prop` unquoted and splits on `'`/`"` in a fragile way; only handles single-quoted `content='...'`. Standard HTML `content="..."` breaks extraction.
- **Fix:** Use a parser or a robust regex; escape `prop`. Also deduplicate scraper logic rather than maintaining two copies.

### 4. Broken pagination on invalid input (`app/page.tsx` / `app/news/page.tsx`)
- **Line:** 21 (`parseInt`) can return `NaN`. `currentPage: NaN` causes broken pagination links and empty slices.
- **Fix:** Guard with `isNaN(page) ? 1 : page`.

---

## 🟠 High

### 5. Incorrect HTML entity decoding (`lib/article-scraper.ts`)
- **Line:** 11 (`decodeHtmlEntities`): `&quot;` maps to single quote `'` instead of double quote `"`. Function is also dead code (never called) but misleading.
- **Fix:** Correct mapping or remove dead code.

### 6. Unvalidated `fetch` enables SSRF / open redirect (`lib/article-scraper.ts`)
- **Line:** 27–34 (`scrapeArticleMeta`). `fetch(url)` has zero URL validation; passes any `post.url` through.
- **Fix:** Require `https:`, block private/local IPs, or use an allowlist.

### 7. Missing auth/checks in data routes (`app/api/genus/[slug]/route.ts`) — acceptable for public site, but `scrapeArticleMeta` has no rate limit or retry.
- **Line:** 364 (`getEnrichedPostById`). External fetch with 10s timeout blocks page generation; no caching/retry abstraction.
- **Fix:** Cache enriched results by post ID; defer enrichment out of metadata/route generation.

### 8. Feature parity gap — no `notFound()` / themed 404 (`app/genus/[slug]/page.tsx`)
- **Line:** 30–37. Returns `200` with inline `<div>` instead of calling `notFound()` (needs `app/not-found.tsx`).
- **Fix:** Call `notFound()`.

### 9. Navigation link broken (`components/Navigation.tsx`)
- **Line:** 50 links to `/feed`; actual route is `app/feed.xml/route.ts`. Breaks user-facing RSS access.
- **Fix:** Link to `/feed.xml` or add redirect.

---

## 🟡 Medium

### 10. Filter links unimplemented (`app/genera/page.tsx`)
- Filter links include `/genera?period=...`, but page ignores `searchParams`; `getGeneraByPeriod()` exists but is never called.
- **Fix:** Read `searchParams` and apply filter.

### 11. Architecture duplication / missing service layer (`lib/genus-data.ts` vs `lib/article-scraper.ts`)
- `scrapeArticleMeta`, `getMeta`, `enrichPostMetadata`, `getEnrichedPostById` duplicated almost identically in both files. `genus-data.ts` (382 lines) also mixes JSON I/O, network scraping, pagination, formatting, and favicon logic with no abstraction.
- **Fix:** Import from `article-scraper.ts`; separate data access / domain services / presentation utilities.

### 12. Pagination uses raw `<a>` instead of `<Link>` (`app/page.tsx`, `app/news/page.tsx`)
- Causes full page reloads rather than client-side navigation.
- **Fix:** Replace with `<Link href="/...?page=...">`.

### 13. Memory leak risk (`components/MasonryGrid.tsx`)
- **Line:** 35–45. `setInterval` polls every 50ms for `window.Masonry` with no max-attempt cap. If library never loads, loop runs indefinitely (until unmount).
- **Fix:** Cap attempts; add `clearInterval` properly.

### 14. Over-engineered masonry init (`components/MasonryGrid.tsx`)
- Polling approach is over-engineered; `window.Masonry` is loaded globally via `beforeInteractive` script. Should rely on dependency/ready-state rather than polling.
- **Fix:** Use `useEffect` with library-ready guard or load script explicitly.

### 15. `force-dynamic` on homepage (`app/page.tsx` line 11)
- `export const dynamic = "force-dynamic"` disables static generation unnecessarily; data is from bundled JSON.
- **Fix:** Remove unless dynamic per-request is required.

### 16. Broken article scraper regex (`lib/article-scraper.ts` line 54–57)
- `getMeta` builds `RegExp('<meta\s+(?:property|name)=' + prop + ... )` without escaping; fragile for common HTML.
- **Fix:** Escape `prop` or use DOM parser.

### 17. Unimplemented feature parity (vs `~/Sites/recovery/current`)
- **Missing:** search (`search.php` / `searchform.php`), sitemap, taxonomy/filter archive pages (`chronostratigraphy_taxonomy.php`), comments UI (`comments.php`), themed 404 (`404.php`), `feed` link correction.
- **Also:** `genera` filter by period is partially wired but unimplemented.
- **Fix:** Prioritize missing parity features or document as out of scope.

---

## 🟢 Low / DX / Conventions

### 18. Type issues (`components/MasonryGrid.tsx`, `lib/genus-data.ts`)
- `any` for `msnry`, `window.Masonry`, `imagesLoaded`. `JSON.parse` typed as `any[]`.
- **Fix:** Add interfaces; avoid `any`.

### 19. Unused/dead code (`lib/article-scraper.ts`)
- `decodeHtmlEntities` dead; `ScrapedMeta` used but not imported correctly; file references broken types.
- **Fix:** Remove dead code or fix imports/types.

### 20. Turbopack config leftover (`next.config.ts`)
- Lines 5–12 define `@tailwindcss/turbopack` loaders, but site uses `public/css/main.css` (no Tailwind). Leftover boilerplate.
- **Fix:** Remove turbopack config or document Tailwind usage.

### 21. Documentation gaps (`README.md`, `.env.example` missing)
- `README.md` is `create-next-app` boilerplate; claims `next/font` usage incorrectly; no `.env.example` despite `NEXT_PUBLIC_SITE_URL` used in `feed.xml/route.ts`.
- **Fix:** Update README; add `.env.example`; document scraper behavior.

---

## Feature Parity Comparison (Next.js site vs `~/Sites/recovery/current`)

| Feature | `recovery/current` (WP) | Next.js site | Status |
|---|---|---|---|
| Site search | `search.php` / `searchform.php` | Missing | ❌ Missing |
| 404 page | `404.php` (themed) | `notFound()` not used; inline `<div>` on missing genus | ❌ Broken |
| Sitemap | Default WP sitemap behavior / possible plugin | No `sitemap.ts` / route | ❌ Missing |
| Taxonomy / filter archive | `chronostratigraphy_taxonomy.php` | Partial links (`/genera?period=...`) but filter unimplemented | ⚠️ Partial |
| Comments | `comments.php` | Data field `comment_status` exists; no UI | ❌ Missing |
| RSS feed | WP native feed / custom | `feed.xml/route.ts` exists; nav points to wrong URL (`/feed`) | ⚠️ Link broken |
| Post pagination | Theme pagination | Raw `<a>` links (full reload) | ⚠️ Suboptimal |
| Custom meta box / data model | Custom plugin (`genus-post-type`) | `lib/genus-data.ts` handles from JSON; no CMS integration | ⚠️ Different architecture |
| CSS/themes | Theme (`fossils-master`) with `main.css` | `public/css/main.css` + component styles; masonry library included | ⚠️ Similar |
| Comments (data) | `comments.php` | `comment_status` / `comment_count` fields present but unused in UI | ❌ Missing |

---

## Aggregated Severity Count
- **Critical:** 4
- **High:** 5 (+ 4 parity-critical)
- **Medium:** 8
- **Low:** 3

---

## Recommended Next Steps (if moving to Iterate Mode)
1. Fix `getAllPosts` import and `generateStaticParams` crash (`app/news/[id]/page.tsx`).
2. Add `try/catch` to `loadData()` (`lib/genus-data.ts`).
3. Deduplicate `article-scraper.ts` and `genus-data.ts`; fix `getMeta` regex and URL validation.
4. Fix pagination (`parseInt` guard + `<Link>` replacement).
5. Fix `Navigation.tsx` `/feed` link; add `notFound()` usage; implement `searchParams` filter on `/genera`.
6. Add `.env.example`, update `README.md`, remove turbopack leftover.
7. Address feature parity (search, sitemap, comments UI, themed 404) or document out-of-scope.

---

*Review completed: single mode, no fixes applied. All findings include file/line references from subagent outputs. For fix-and-rerun, request iterate mode targeting specific findings above.*
