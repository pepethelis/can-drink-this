import type { CollectionEntry } from "astro:content";

type Review = CollectionEntry<"reviews">;
export type ReviewStatsData = {
  totalReviews: number;
  favoritesCount: number;
  brandsCount: number;
  sponsoredCount: number;
  categoryData: [string, number][];
  authorData: [string, number][];
  typeData: [string, number][];
  brandData: [string, number][];
  timeData: [string, number][];
  postingGapData: [string, number][];
  tasteData: [string, number][];
  containerData: [string, number][];
  sweetenerData: [string, number][];
  caffeineDistData: [string, number][];
  alcoData: [string, number][];
  activityData: [string, number][];
  creationActivityData: [string, number][];
  sponsorData: [string, number][];
};

function countValues(reviews: Review[], getValues: (review: Review) => string[]) {
  const counts = new Map<string, number>();
  for (const review of reviews)
    for (const value of getValues(review))
      counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function getReviewStats(
  reviews: Review[],
  creationReviews: Review[] = reviews
): ReviewStatsData {
  const brandName = (review: Review) => {
    const brand = review.data.brand;
    return brand?.includes("/") ? brand.slice(0, brand.indexOf("/")) : brand;
  };
  const brands = new Set(reviews.map(brandName).filter(Boolean));
  const sponsorData = countValues(reviews, review => review.data.sponsor ?? []);
  const categoryData = countValues(reviews, review => [review.data.category]);
  const authorData = countValues(reviews, review => [review.data.author]);
  const typeData = countValues(reviews, review => review.data.types ?? []);
  const brandData = countValues(reviews, review => {
    const brand = brandName(review);
    return brand ? [brand] : [];
  }).slice(0, 15);
  const tasteData = countValues(reviews, review => review.data.taste ?? []).slice(0, 15);
  const containerData = countValues(reviews, review => review.data.container ?? []);

  const sweetenerMap = new Map<string, number>();
  for (const [value, count] of countValues(reviews, review => review.data.sweeteners ?? [])) {
    const lowerValue = value.toLowerCase();
    const key = lowerValue.includes("juice")
      ? "juice"
      : lowerValue.includes("extract")
        ? "extract"
        : value;
    sweetenerMap.set(key, (sweetenerMap.get(key) ?? 0) + count);
  }

  const caffeineMap = new Map<string, number>();
  const alcoMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const activityMap = new Map<string, number>();
  const postingGapMap = new Map<string, { totalDays: number; count: number }>();
  for (const review of reviews) {
    const caffeineKey = review.data.caffeine != null ? `${review.data.caffeine} mg` : "No caffeine";
    caffeineMap.set(caffeineKey, (caffeineMap.get(caffeineKey) ?? 0) + 1);
    const alcoKey = review.data.alco != null && review.data.alco !== 0
      ? `${review.data.alco}%`
      : "No alcohol";
    alcoMap.set(alcoKey, (alcoMap.get(alcoKey) ?? 0) + 1);

    const publishedAt = review.data.publishedAt;
    if (publishedAt) {
      const key = dateKey(publishedAt);
      const month = key.slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
      activityMap.set(key, (activityMap.get(key) ?? 0) + 1);
      const createdAt = review.data.createdAt;
      if (createdAt) {
        const current = postingGapMap.get(month) ?? { totalDays: 0, count: 0 };
        postingGapMap.set(month, {
          totalDays: current.totalDays + (publishedAt.getTime() - createdAt.getTime()) / 86400000,
          count: current.count + 1,
        });
      }
    }
  }

  const timeData: [string, number][] = [];
  if (monthMap.size > 0) {
    const keys = [...monthMap.keys()].sort();
    const current = new Date(`${keys[0]}-01`);
    const end = new Date(`${keys[keys.length - 1]}-01`);
    while (current <= end) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      timeData.push([key, monthMap.get(key) ?? 0]);
      current.setMonth(current.getMonth() + 1);
    }
  }

  const creationMap = new Map<string, number>();
  for (const review of creationReviews) {
    const createdAt = review.data.createdAt;
    if (createdAt) {
      const key = dateKey(createdAt);
      creationMap.set(key, (creationMap.get(key) ?? 0) + 1);
    }
  }

  return {
    totalReviews: reviews.length,
    favoritesCount: reviews.filter(review => review.data.favorite).length,
    brandsCount: brands.size,
    sponsoredCount: reviews.reduce((count, review) => count + (review.data.sponsor?.length ?? 0), 0),
    categoryData,
    authorData,
    typeData,
    brandData,
    timeData,
    postingGapData: [...postingGapMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, value.totalDays / value.count]),
    tasteData,
    containerData,
    sweetenerData: [...sweetenerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12),
    caffeineDistData: [...caffeineMap.entries()].sort((a, b) => b[1] - a[1]),
    alcoData: [...alcoMap.entries()].sort((a, b) => b[1] - a[1]),
    activityData: [...activityMap.entries()].sort(([a], [b]) => a.localeCompare(b)),
    creationActivityData: [...creationMap.entries()].sort(([a], [b]) => a.localeCompare(b)),
    sponsorData,
  };
}