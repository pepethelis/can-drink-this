/**
 * Per-page metadata for the non-content pages (listings, utility pages).
 *
 * Content pages (posts, reviews) build their own meta from frontmatter; these
 * pages have no frontmatter, so without this they would all share `SITE.desc`
 * and the default OG image. Each key also produces an OG image at
 * `/og/<key>.png` via `src/pages/og/[slug].png.ts`.
 */
export const PAGE_META = {
  posts: {
    title: "Posts",
    description:
      "Статті та нотатки про напої — усе, що виходить за формат окремого огляду.",
  },
  reviews: {
    title: "Reviews",
    description:
      "Усі огляди напоїв з фільтрами за категорією, брендом, типом, смаком і доступністю.",
  },
  awaited: {
    title: "Awaited reviews",
    description:
      "Готові огляди, які очікують публікації на інших майданчиках. Після виходу там вони зʼявляться у загальному списку.",
  },
  drinks: {
    title: "Drinks",
    description:
      "Каталог усіх оглянутих напоїв, згрупований за першою літерою назви та брендом.",
  },
  stats: {
    title: "Stats",
    description:
      "Статистика за всіма оглядами: бренди, типи, смаки, кофеїн, тара та активність публікацій.",
  },
  archives: {
    title: "Archives",
    description: "Архів оглядів, згрупований за роками публікації.",
  },
  search: {
    title: "Search",
    description: "Повнотекстовий пошук по всіх оглядах і постах сайту.",
  },
  about: {
    title: "About",
    description: "Про блог і його автора: навіщо тут огляди напоїв.",
  },
  "404": {
    title: "404 Not Found",
    description:
      "Такої сторінки немає. Можливо, посилання застаріло або в адресі помилка.",
  },
} as const satisfies Record<string, { title: string; description: string }>;

export type PageMeta = { title: string; description: string };

/** Keeps paginated routes from sharing one title/description. */
export function paginatedMeta(meta: PageMeta, currentPage: number): PageMeta {
  if (currentPage <= 1) return meta;
  return {
    title: `${meta.title}, сторінка ${currentPage}`,
    description: `${meta.description} Сторінка ${currentPage}.`,
  };
}

/** OG image path for a `PAGE_META` key. */
export const ogImageFor = (key: keyof typeof PAGE_META) => `/og/${key}.png`;
