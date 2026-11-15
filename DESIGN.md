# Dinosauria Network — Design System

Derived from the homepage (`app/page.tsx`) and global styles (`public/css/main.css`).

## Layout

- **Homepage**: Masonry grid (`MasonryGrid`) with asymmetric columns (`.grid .hentry`).
- **First card** spans full width (`width: 97%` at ≥960px, class `.first`).
- **Odd/even cards**: 42% / 51% split with 1.5% gutters (asymmetric editorial feel).
- **Responsive**: 50% at ≥640px; single column below.
- **Pagination**: Previous/Next nav links (`nav-links`) with aesthetic borders.

## Color Palette

| Role | Value | Usage |
|---|---|---|
| Primary dark | `#4f362a` | Headings, buttons (`btn-primary`), links, borders |
| Secondary brown | `#8e6450` | Hover states, accents |
| Background | `#f5f5f5` | Card backgrounds (`.genus-card`, `.taxon`), page bg |
| Surface | `#fff` | Cards (`.period-card`), content well |
| Border | `#b8b6ad` | Card borders, divider rules |
| Text body | `#46423b` | Main body text (`.entry-summary`) |
| Subtle text | `#666` | Meta, subtitles (`.genus-period`, `.genus-subtitle`) |
| Footer bg | `#6f6e68` | Site footer |
| Footer text | `#d0cdc9` | Footer links |

## Typography

- **Base**: System sans-serif (normalize.css `font-family: sans-serif`).
- **Headings** (`h2.summary-title`, `.entry-header h2`): Large, dark brown (`#4f362a`), tight leading.
- **Body** (`.entry-summary p`): `#46423b`, readable size.
- **Meta** (`.entry-meta`, `.updated`): Small, muted (`#666`), with `•` separator (`.sep`).
- **Labels** (`.sr-only`, `.screen-reader-text`): Hidden until focused.

## Article Card (`ArticleCard` component)

Each post is an `<article>` with:
- **Image**: Responsive `<picture>` (1024 / 640 / 480) inside `.post-image.alignleft`.
- **Header** (`.entry-header`): Title (`h2.summary-title`) + meta bar (`.entry-meta`).
- **Meta bar**: Source favicon + author link + `Posted` time link.
- **Summary** (`.entry-summary`): Excerpt + button group (`btn-group`) with disabled “reading time” badge and “Read more” link.
- **Classes**: `post`, `hentry`, `type-post`; first/even/odd variants for masonry layout.

## Responsive Images (`<picture>`)

- `media="(min-width: 1024px)"` → `-1024.jpg`
- `media="(min-width: 640px)"` → `-640.jpg`
- Fallback `<img>` → `-1024.jpg` or `-640.jpg`
- All images use `loading="lazy"`, explicit `width/height`, `alt` text.

## Editorial Details (from `page/module.css` / editorial page)

- **Editorial page** (`app/how-many-dinosaurs-are-there/page.tsx`) uses CSS module `.page.module.css`.
- **Module styles**: Clean typography, section headings (`h1`-`h3`), editorial callout cards, count display (`.countDisplay`), list layout.
- **No `dangerouslySetInnerHTML`**: All editorial content is JSX/components.

## Navigation & Interaction

- **Skip link** (`.skip-link`): Hidden off-canvas (`top: -10000px`), visible on focus (`top: 0.5rem`).
- **Pagination**: `.pagination a` (bordered, rounded); `.current` filled brown.
- **Back links** (`.back-link`): Brown (`#4f362a`) background, white text, hover darkens to `#3d2b20`.
- **Buttons** (`.btn-primary`, `.btn-sm`): Brown fill, white text; disabled state styled.

## Accessibility

- `sr-only` / `.screen-reader-text` for hidden labels.
- `aria-label`, `aria-describedby`, `role="group"`, `aria-label` on navigation.
- Focus outlines (`:focus-visible`) with `#333` and `2px` offset.
- Semantic HTML: `<article>`, `<header>`, `<nav>`, `<time datetime="...">`.

## Data Pattern (`post_date` / `<time>`)

- `post_date` from dataset feeds `<time dateTime={...}>`.
- Valid HTML5 formats per MDN: `YYYY-MM-DD`, `YYYY-MM`, `YYYY`.
- Confirmed exact → full date; confirmed month → `YYYY-MM`; year only → `YYYY`.

## Key Files

- Homepage: `/app/page.tsx`
- Components: `/components/ArticleCard.tsx`, `/components/MasonryGrid.tsx`
- Global CSS: `/public/css/main.css`
- Editorial CSS module: `/app/how-many-dinosaurs-are-there/page.module.css`
- Data layer: `/lib/services/domain.ts`, `/lib/services/data.ts`
