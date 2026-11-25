# Admin UI — Testing Notes (Phase 5)

When you log in and browse the admin UI, verify:

## Auth (Phase 1b)
- [ ] Google sign-in works; GitHub sign-in works.
- [ ] Session persists on reload.
- [ ] Anonymous → redirect to `/login` on `/admin*` and `/api/admin*`.
- [ ] Sign-out → back to `/login`.

## Gates
- [ ] Viewer (first signup is admin; flip role in DB if needed) → redirected to `/admin/denied`.
- [ ] `/admin/denied` renders without crashing.

## Dashboard (`/admin`)
- [ ] Shows role, papers/stories/images/sources counts (values match `npm run editorial:status`).
- [ ] Pipeline bar list lists every status present, each linking to `/admin/articles?status=…`.
- [ ] Ingestion column chart shows the last ~7 daily ingest counts (trailing empty UTC days trimmed, so a 01:00 UTC read doesn't end on a lone zero); caption states the exact date range and total.
- [ ] Score distribution has 10 buckets summing to `papers − unscored`; the 0.7+ tail is highlighted and the note states the 0.75 auto-publish gate.
- [ ] Needs attention: drafts without an image, dead image references, assets pending verification, unscored papers, published in the last 30 days.
- [ ] Each attention count that has a list opens that list already filtered (drafts without image → `?status=draft&image=none`, dead references → `?image=missing`).

## Articles (`/admin/articles`)
- [ ] List renders (headline, status badge, dates).
- [ ] Image column shows a thumbnail when the story has a working image, a gold `!` when the referenced file is missing, `—` when there is none.
- [ ] Search box works; status filter works; pagination works.
- [ ] Image filter: "No image" and "Image file missing" return the same counts the dashboard reports, and the filter survives paging.
- [ ] Headline is the link to the editor.

## Article editor (`/admin/articles/[id]`)
- [ ] Headline/description editable + saves.
- [ ] Publish / Request review / Reject / Unpublish transitions work.
- [ ] `publication_events` rows created (check via SQL).
- [ ] Status badge reflects current status.
- [ ] Image panel (right column on desktop, stacked when narrow) shows image + caption/licence/credit/reuse status.
- [ ] Attach by URL: paste an image URL → Attach → preview appears, `media_assets` row created as `pending_verification`, `body.image` updated, file cropped to 1024×633 with `-1024/-640/-480.jpg` derivatives.
- [ ] Attach by file: choose a local image → same result, `originalUrl` records the filename.
- [ ] Rejects non-images, >5 MB, `svg`, and private/internal hosts.
- [ ] "Clear image reference" on a missing image removes `body.image` (file stays on disk).
- [ ] Delete → returns to `/admin/articles`.

## Sources (`/admin/sources`)
- [ ] Lists sources + recent ingestions (query `ingestion_runs`).

## Categories (`/admin/categories`)
- [ ] Lists categories.

## Images (`/admin/images`)
- [ ] Lists assets (storagePath, license, holder).
- [ ] Mark verified / pending buttons work.

## Visual (per spec)
- [ ] Warm beige background, square corners, thin borders, no SaaS cards.
- [ ] Georgia headings, Verdana/Arial body.
- [ ] No glassmorphism/gradients/floating nav.

## Smoke (all pages)
- [ ] `npm run typecheck` + `npm run build` green.
- [ ] Dev server: `/admin*` all load, no console errors.
