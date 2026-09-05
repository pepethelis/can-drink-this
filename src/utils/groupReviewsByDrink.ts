import type { CollectionEntry } from "astro:content";
import getTitleFormAliases from "./getTitleFormAliases";
import { slugifyStr } from "./slugify";

export type DrinkGroup = {
  id: string;
  title: string;
  aliases: string[];
  brand: string | null;
  brandBase: string | null;
  types: string[];
  cover: CollectionEntry<"reviews">["data"]["cover"];
  reviews: CollectionEntry<"reviews">[];
  letter: string;
};

const normalizeKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const getFilenameStem = (filePath: string | undefined): string | null => {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, "/");
  const base = normalized.split("/").pop();
  if (!base) return null;
  return normalizeKey(base.replace(/\.(md|mdx)$/i, ""));
};

const getReviewKeys = (review: CollectionEntry<"reviews">): string[] => {
  const keys = review.data.aliases.map(normalizeKey);
  const filenameStem = getFilenameStem(review.filePath);
  if (filenameStem) keys.push(filenameStem);
  return keys.filter(Boolean);
};

const getBrandBase = (brand: string | null | undefined): string | null => {
  if (!brand) return null;
  const idx = brand.indexOf("/");
  return idx === -1 ? brand : brand.slice(0, idx);
};

const getLetterBucket = (title: string): string => {
  const first = title.trim().charAt(0).toUpperCase();
  return /[A-ZА-ЯЁІЇЄ]/.test(first) ? first : "#";
};

// Higher priority reviews (own-authored) sort first, then newer reviews first
const compareReviews = (
  a: CollectionEntry<"reviews">,
  b: CollectionEntry<"reviews">
) => {
  const aOwn = a.data.category === "власні огляди" ? 1 : 0;
  const bOwn = b.data.category === "власні огляди" ? 1 : 0;
  if (aOwn !== bOwn) return bOwn - aOwn;

  const aDate = new Date(a.data.updatedAt ?? a.data.publishedAt ?? 0).getTime();
  const bDate = new Date(b.data.updatedAt ?? b.data.publishedAt ?? 0).getTime();
  return bDate - aDate;
};

class UnionFind {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  union(a: number, b: number) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent[rootB] = rootA;
  }
}

/**
 * Groups reviews of the same physical drink together, even when written by
 * different reviewers with differently-ordered aliases. Two reviews are
 * merged if they share any normalized alias OR the same normalized filename
 * stem — matches chain transitively, so A+B via a shared alias and B+C via
 * a shared filename puts A, B and C in one group.
 */
const groupReviewsByDrink = (
  reviews: CollectionEntry<"reviews">[]
): DrinkGroup[] => {
  const unionFind = new UnionFind(reviews.length);
  const keyToIndex = new Map<string, number>();

  reviews.forEach((review, index) => {
    for (const key of getReviewKeys(review)) {
      const existing = keyToIndex.get(key);
      if (existing === undefined) keyToIndex.set(key, index);
      else unionFind.union(existing, index);
    }
  });

  const groupedByRoot = new Map<number, CollectionEntry<"reviews">[]>();
  reviews.forEach((review, index) => {
    const root = unionFind.find(index);
    const bucket = groupedByRoot.get(root) ?? [];
    bucket.push(review);
    groupedByRoot.set(root, bucket);
  });

  const usedIds = new Map<string, number>();

  const groups: DrinkGroup[] = [...groupedByRoot.values()].map(members => {
    const sorted = [...members].sort(compareReviews);
    const representative = sorted[0];
    const title = getTitleFormAliases(representative.data.aliases);

    const seenAliases = new Set<string>();
    const aliases: string[] = [];
    for (const member of sorted) {
      for (const alias of member.data.aliases) {
        const key = normalizeKey(alias);
        if (!key || seenAliases.has(key)) continue;
        seenAliases.add(key);
        aliases.push(alias);
      }
    }

    const brand =
      representative.data.brand ??
      sorted.find(r => r.data.brand)?.data.brand ??
      null;

    const seenTypes = new Set<string>();
    const types: string[] = [];
    for (const member of sorted) {
      for (const type of member.data.types ?? []) {
        if (seenTypes.has(type)) continue;
        seenTypes.add(type);
        types.push(type);
      }
    }

    const cover =
      representative.data.cover ?? sorted.find(r => r.data.cover)?.data.cover;

    const baseId = slugifyStr(title);
    const usedCount = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, usedCount + 1);
    const id = usedCount === 0 ? baseId : `${baseId}-${usedCount + 1}`;

    return {
      id,
      title,
      aliases,
      brand,
      brandBase: getBrandBase(brand),
      types,
      cover,
      reviews: sorted,
      letter: getLetterBucket(title),
    };
  });

  return groups.sort((a, b) => a.title.localeCompare(b.title));
};

export default groupReviewsByDrink;
