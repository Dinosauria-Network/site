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

## Articles (`/admin/articles`)
- [ ] List renders (headline, status badge, dates).
- [ ] Search box works; status filter works; pagination works.
- [ ] Click a row → `/admin/articles/[id]`.

## Article editor (`/admin/articles/[id]`)
- [ ] Headline/description editable + saves.
- [ ] Publish / Request review / Reject / Unpublish transitions work.
- [ ] `publication_events` rows created (check via SQL).
- [ ] Status badge reflects current status.

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
