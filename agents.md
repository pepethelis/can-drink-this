# Project: Can Drink This

## Overview

A beverage review blog (primarily energy drinks) built on Astro 5. Content is written in Markdown using Obsidian vault conventions. The site is deployed to GitHub Pages under `reviews.pepethelis.top`.

- **Framework**: Astro 5.16.6
- **Package manager**: Bun
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict)
- **Site URL**: `https://reviews.pepethelis.top`
- **Author**: pepethelis (Telegram: `@kallection`)
- **Site description**: "Ваші енергоси вже оглянуті" (Your energy drinks are already reviewed)

## Commands

All commands use **Bun** as the package manager.

```bash
bun run dev        # Dev server at localhost:4321
bun run build      # astro check + build + pagefind index + copy to public/
bun run preview    # Preview production build
bun run sync       # Regenerate Astro content collection types (run after schema changes)
bun run typecheck  # tsc --noEmit
bun run format     # Prettier
bun run lint       # ESLint
```

There are no unit tests in this project. Type checking (`bun run typecheck`) and `astro check` (included in `build`) are the primary correctness checks.

Docker is also available: `docker compose up -d` runs the site on port 8080.

Build output goes to `dist/`. Pagefind search index is generated post-build and copied into `public/pagefind/`.

**Content is a separate repo.** The `Dockerfile` build fetches `src/data/{posts,reviews,assets}` from the `content` folder of `pepethelis/can-drink-this`'s `main` branch (replacing whatever is checked out locally) before building — matches the GitHub Pages publish workflow. It adds a cache-busting `ADD` of the GitHub commits API so the layer invalidates when the content repo changes. Local `src/data/` content is only a dev-time sample/placeholder.

## Features

- **Full-text search**: Pagefind (client-side, no server needed)
- **Dynamic OG images**: Auto-generated per post and review using Satori + resvg; reviews can include a product photo in the right panel
- **Client-side review filters**: `/reviews` renders all reviews with `data-*` attributes; `FilterBar.astro` + vanilla JS + `history.pushState` filters by category, author, type, brand, container, sponsor (single-select), taste, color, availability (multi-select, OR logic, comma-separated in URL), and favorite (boolean toggle)
- **Stats/analytics page**: `/stats` uses React (`@astrojs/react@5`) + Recharts 3.x for charts, scoped per category tab (all/own/friendly/subscribers): category, type, brand, author, sponsor, time, publication year/month, posting-gap, taste, container, sweetener, caffeine, alcohol, activity distributions
- **Comments**: Giscus (GitHub Discussions–backed), dynamically loaded
- **Dark/light mode**: CSS variable–based, persisted in `localStorage`
- **Reading progress bar**: `ReadingProgress.astro`, fixed top bar on review/post detail pages
- **Scheduled posts**: Posts with future `publishedAt` are hidden (with 15-min margin)
- **Obsidian integration**: Image and wiki-link syntax supported natively
- **RSS feed**: Available at `/rss.xml`
- **Sitemap**: Auto-generated, respects `SITE.showArchives`
- **Docker**: `docker-compose.yml` + `Dockerfile` for containerized builds (pulls content from the separate content repo — see above)

## Architecture

This is a customized fork of the [AstroPaper](https://github.com/satnaing/astro-paper) Astro blog theme, extended with a full **beverage review** system alongside the standard blog.

### Content authoring uses Obsidian conventions

The `src/data/` directory is an Obsidian vault. Two custom Remark plugins handle non-standard syntax:
- `src/utils/remark-obsidian-image.ts` — transforms `[[image.png]]` into standard image tags, resolving assets from `src/data/assets/<brand>/`
- `remark-wiki-link` + a custom `rewriteWikiLinks` rehype plugin — transforms `[[Note|alias]]` internal links

### Two content types

Both collections are defined in `src/content.config.ts` with Zod schemas in `src/schemas.ts`, loaded from Markdown via glob loaders:

- **`posts`** (`src/data/posts/`) — standard blog articles with a simple schema
- **`reviews`** (`src/data/reviews/`) — beverage reviews with a rich domain schema (brand, types, volume, caffeine, container, packager, taste, sweeteners, availability, etc.)

### Remark plugins (Markdown processing)
- `remark-reading-time` — injects estimated reading time
- `remark-toc` — table of contents generation
- `remark-collapse` — collapsible sections
- `remark-obsidian-image` — custom: Obsidian image syntax `[[image.jpg]]`
- `remark-wiki-link` — Obsidian wiki links `[[Note|alias]]`
- `remark-spoiler` — custom: spoiler blocks
- Custom `rewriteWikiLinks` — remaps internal link URLs

### Rehype plugins (HTML processing)
- Auto-link headings
- Link URL rewriting

### Other integrations
- `@astrojs/react@5` — React for `StatsCharts.tsx` (Recharts charts on `/stats`)
- `@astrojs/sitemap` — auto sitemap (filters archive pages)
- `@astrojs/rss` — RSS feed
- Shiki syntax highlighting — themes: `min-light` / `night-owl`
- `@shikijs/transformers` — diff, highlight, word-highlight notation
- Tailwind CSS v4 via Vite plugin

### Visibility / Filtering Logic

`src/utils/postFilter.ts` is the single source of truth for whether an entry appears in listings. It must be passed to every `getCollection()` call. Rules:

1. Must have `publishedAt` date
2. For `category === "власні огляди"`: status must NOT be `prebuild` or `to create`
3. `publishedAt` must be within 15-minute scheduled margin of now
4. `hidden` must be `false`

In `DEV` mode, future-dated posts are shown. Always pass `postFilter` when fetching either collection for public pages.

## Content Collections

Defined in `src/content.config.ts` using glob loaders. Enums live in `src/schemas.ts`; the actual field-level schema (nullability, defaults) is defined inline in `content.config.ts`, not in `schemas.ts` — check both when changing a field.

### `reviews` collection

- **Source**: `src/data/reviews/**/*.md` — loaded by a custom `reviewsLoader` (wraps `glob`)
- **Category is derived from the subdirectory** — do NOT set `category` in frontmatter:
  - `src/data/reviews/own/` → `власні огляди`
  - `src/data/reviews/friendly/` → `дружні огляди`
  - `src/data/reviews/subscribers/` → `огляди від підписників`
  - (unmatched folder defaults to `власні огляди`)
- `categoryType` enum also has a `"пост"` value, unused by the reviews loader (reserved/legacy)
- **Statuses**: `prebuild` → `to create` → `to enrich` → `to publish` → `published` → `needs update` → `to update`

Key fields:

| Field | Type | Notes |
|---|---|---|
| `aliases` | string[] (min 1) | Display titles; first alias is primary title |
| `brand` | string, nullish | Free-form; uses `base/subline` format (e.g. `monster/ultra`). `brandType` enum in schemas.ts is a reference list only, not enforced |
| `types` | `beverageType` enum[] | Plural, multi-value field (was singular `type` — renamed). Values: `alco`, `beer`, `cider`, `ayran`, `coffee`, `energy`, `fizzy`, `juice`, `yogurt`, `kvass`, `kombucha`, `plant-based`, `radler`, `tea`, `water`, `pre-workout`, `other` |
| `manufacturer` | string, nullish | Free-form; `manufacturerType` enum in schemas.ts is a reference list only, not enforced on this field |
| `volume` | `volumeType` enum[], nullish | Predefined volumes in liters, e.g. `"2"`…`"0.15"` (21 values incl. `"0.3"`) — see `volumeType` in schemas.ts for the full list |
| `container` | `containerType` enum[], nullish | `can`, `glass`, `plastic`, `tetrapak` |
| `packager` | `packagerType` enum, nullish | `ag`, `amp`, `bagpak`, `ball`, `canpack`, `crown`, `quality` |
| `caffeine` | number (14–100), nullish | mg per 100 ml |
| `alco` | number (0–50), nullish | Alcohol % |
| `taste` | string[], nullish | Flavor descriptors |
| `sweeteners` | string[], nullish | |
| `availability` | 0–5, nullish | Rating for local store availability |
| `primaryColors` | string[], nullish | Package color descriptors |
| `favorite` | boolean, nullish | Whether it's a favourite drink |
| `category` | enum, default `власні огляди` | Derived from folder path — do not set in frontmatter |
| `author` | string, default `SITE.author` | Used for the author filter on `/reviews` and stats |
| `sponsor` | string[], nullish | Sponsor name(s); filterable on `/reviews` |
| `cover` | image, nullish | Product photo; supports Obsidian `[[image.jpg]]` syntax. **Not** called `ogImage` (that name is reserved for `posts`) |
| `gallery` | image[], nullish | |
| `createdAt` / `updatedAt` | date, nullish | `createdAt` feeds the "posting gap" / creation-activity stats |
| `publishedAt` | date, nullish | Required to be visible |
| `hidden` | boolean, optional | Excludes from all listings |
| `pinned` | boolean, optional | |
| `tags` | string[], default `[]` | |
| `canonicalURL` | string, optional | |
| `externalUrl` | string, nullish | Rendered as an "External" link in the taxonomy section |
| `related` | string[], default `[]` | |
| `contentTgPosts` | string[], optional | Telegram post embed URLs |

### `posts` collection

- **Source**: `src/data/posts/**/*.md`
- Schema: `publishedAt`, `updatedAt`, `aliases`, `summary`, `author`, `pinned`, `hidden`, `canonicalURL`, `status`, `externalUrl`, `ogImage`, `gallery`, `related`
- Note `posts` uses `ogImage`; `reviews` uses `cover` for the equivalent field

## Pages & Routes

```
/                          → src/pages/index.astro              (post listing, pinned first)
/posts/[...page]           → paginated posts
/posts/[...slug]/          → single post
/posts/[...slug]/index.png → generated OG image (Satori + photo)
/reviews/                  → client-side filter page (all reviews, no pagination)
/reviews/[...page]         → paginated reviews (fallback / direct access)
/reviews/[...slug]/        → single review
/reviews/[...slug]/index.png → generated OG image (Satori + product photo)
/stats                     → analytics charts (React + Recharts)
/tags/                     → tag cloud (all content types)
/tags/[tag]/[...page]      → filtered by tag (posts + reviews)
/archives/                 → archive listing (if SITE.showArchives)
/search                    → pagefind full-text search
/about                     → about.md
/rss.xml                   → RSS feed
/robots.txt                → auto-generated
/og.png                    → default OG image
```

## Client-Side Filters (`/reviews`)

`src/pages/reviews/index.astro` renders all reviews at build time with `data-*` attributes and computes filter option maps server-side. `src/components/reviews/FilterBar.astro` renders the controls and owns all client-side filtering JS; sub-components are `FilterDropdown.astro`, `FilterBrandDropdown.astro`, `FilterMultiSelect.astro`, `FilterBoolToggle.astro` (all in `src/components/reviews/`).

- **Single-select** (`SINGLE_KEYS`): category, author, type, brand, container, sponsor — custom `<div class="dd-root">` dropdowns with solid CSS panels (no native `<select>` to avoid OS-rendered blur)
- **Multi-select** (`MULTI_KEYS`): taste, color, availability — checkbox dropdowns (`<div class="ms-root">`), OR matching, comma-separated in URL (e.g. `?taste=citrus,orange`)
- **Boolean toggle**: favorite (`?favorite=1`) — `FilterBoolToggle.astro`
- **Brand format**: `?brand=monster` matches all monster sub-brands (via `data-brand-base`); `?brand=monster/ultra` matches exactly (via `data-brand`). Brand groups are built server-side into `BrandGroup[]` (`src/types/reviews.ts`)
- **URL state**: `history.pushState` + `astro:page-load`/`popstate` events for Astro view transitions
- **Active filter badges**: chip row above results, per filter key, with a "clear all" button
- **Cross-filter availability**: options that would yield 0 results are disabled/dimmed (`dd-disabled` / `ms-disabled`)

## OG Image Generation

`src/utils/generateOgImages.ts` — Satori + resvg pipeline. Templates live in `src/utils/og-templates/` (`post.ts`, `review.ts`, `site.ts`).

- **Reviews**: `src/pages/reviews/[...slug]/index.png.ts` — dark-themed card with title, summary, category/type chips, product photo (right panel when `cover` present). Falls back to the post template on error
- **Posts**: `src/pages/posts/[...slug]/index.png.ts` — dark-themed card with title, summary, author, optional photo (uses `ogImage`)
- Images are resized to 480×630 JPEG q82 before base64 encoding into Satori SVG
- `src/utils/loadGoogleFont.ts` validates TTF (`0x00010000`) or OTF (`0x4f54544f`) magic bytes before passing fonts to Satori
- Gated by `SITE.dynamicOgImage` flag

## Stats Page (`/stats`)

`src/pages/stats.astro` computes aggregate data server-side via `getReviewStats` (`src/utils/getReviewStats.ts`) — one scoped `ReviewStatsData` object per category (all/own/friendly/subscribers) — and passes them plus serialized raw review data to `<StatsCharts client:load />`. `getReviewStats` also accepts an optional second `creationReviews` arg (defaults to the same list) to compute creation-time vs. publish-time activity separately — `stats.astro` passes `allReviewsIncludingUnpublished` here so creation-activity charts include unpublished drafts.

`src/components/StatsCharts.tsx` — React component with:
- A category tab switcher (`CATEGORIES`: all/own/friendly/subscribers) that swaps which `ReviewStatsData` is charted
- `DonutChart` — category, caffeine, alcohol distributions
- `HBarChart` — type, brand, author, sponsor, taste, container, sweetener, caffeine (mg), alcohol (%) distributions
- `TimeChart` — reviews over time, publication year/month, posting-gap (days between `createdAt` and `publishedAt`), creation activity
- `useTheme()` hook reads CSS vars on mount + `MutationObserver` on `data-theme` for dark mode reactivity
- Recharts 3.x: `fill` in data objects (not `<Cell>`); tooltip `color` must be set explicitly to prevent dark-mode black text

## Key Components

| Component | Purpose |
|---|---|
| `CardPost.astro` | Post card for listing pages |
| `CardReview.astro` | Review card with beverage-specific metadata |
| `StatsCharts.tsx` | React + Recharts analytics charts for `/stats` |
| `ReviewGrid.astro` | Grid wrapper for review cards |
| `RelatedReviews.astro` | Related reviews section on single review page |
| `Comments.astro` | Giscus comments (dynamically loaded) |
| `Gallery.astro` | Image gallery |
| `TgPost.astro` | Telegram post widget embed |
| `Pagination.astro` | Page navigation |
| `Header.astro` | Site header with navigation |
| `Footer.astro` | Site footer |
| `RightPanel.astro` | Sidebar panel |
| `Breadcrumb.astro` | Breadcrumb navigation |
| `BackButton.astro` | Back navigation (if `SITE.showBackButton`) |
| `ReadingProgress.astro` | Fixed top scroll-progress bar on review/post detail pages |
| `reviews/FilterBar.astro` | `/reviews` filter controls + all client-side filtering logic |
| `reviews/FilterDropdown.astro` | Single-select dropdown (category, author, type, container, sponsor) |
| `reviews/FilterBrandDropdown.astro` | Single-select brand dropdown with base/sub-brand grouping |
| `reviews/FilterMultiSelect.astro` | Multi-select checkbox dropdown (taste, color, availability) |
| `reviews/FilterBoolToggle.astro` | Boolean toggle (favorite) |

## Layouts

| Layout | Purpose |
|---|---|
| `Layout.astro` | Root HTML wrapper (head, scripts, OG) |
| `Main.astro` | Content container with max-width |
| `PostDetails.astro` | Single post view |
| `ReviewDetails.astro` | Single review view — includes taxonomy section above `BackToTopButton` |
| `AboutLayout.astro` | About page |

## ReviewDetails Taxonomy Section

`src/layouts/ReviewDetails.astro` renders a labeled taxonomy grid between the article content and `<BackToTopButton />`. Also renders `<ReadingProgress />` above the header, and an "External" link row (linking to `externalUrl`) when present.

- **Filterable fields** (accent-colored pill links → `/reviews?key=value`): category, type (`types`, per-value), brand, container (per-value), taste (per-value), color/primaryColors (per-value)
- **Info-only fields** (muted tags, no links): sweeteners, caffeine (`N mg/100ml`), alcohol (`N%`), favourite (★), volume (`N L` per item), availability (`N / 5`), manufacturer, packager

## Content Authoring Notes

- Reviews are written in Obsidian and use its `[[image.png]]` and `[[Note|alias]]` syntax
- The `aliases` array (min 1 item) is used as display title — the first alias is the primary title
- `brand` uses `base/subline` format for sub-lines: `monster/ultra`, `redbull/edition`. The base (`monster`) is extracted for brand-group filtering
- Reviews use `cover` (not `ogImage`) for the product photo; it can reference an asset using Obsidian syntax and falls back to dynamic OG generation. Posts use `ogImage`
- `AUTHORS` and `SPONSORS` (`src/constants.ts`) map author/sponsor names to profile links, used in `ReviewDetails.astro` byline and sponsor credit
- A review is only visible when: `publishedAt` is set, `hidden` is `false`, `status` is not `prebuild`/`to create` (for own reviews), and publish time has passed
- Tags are shared across both `posts` and `reviews` collections
