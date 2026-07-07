import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import type { Loader } from "astro/loaders";
import { SITE } from "@/config";
import {
  beverageType,
  categoryType,
  containerType,
  packagerType,
  statusType,
  volumeType,
} from "./schemas";

export const REVIEWS_PATH = "src/data/reviews";
export const POSTS_PATH = "src/data/posts";

type CategoryValue = z.infer<typeof categoryType>;

// Maps subdirectory name → review category (category is not stored in frontmatter)
const FOLDER_CATEGORY: Record<string, CategoryValue> = {
  own: "власні огляди",
  friendly: "дружні огляди",
  subscribers: "огляди від підписників",
};

function reviewsLoader(): Loader {
  const inner = glob({ pattern: "**/[^_]*.md", base: `./${REVIEWS_PATH}` });
  return {
    name: "reviews-loader",
    load: async ctx => {
      // Proxy store.set so every write (initial load + watcher updates) gets
      // category injected from the folder path before hitting storage.
      // Drop digest to prevent the store's digest-equality early-return from
      // skipping the write.
      const originalSet = ctx.store.set.bind(ctx.store);
      ctx.store.set = entry => {
        const folder = entry.id.split("/")[0];
        const category: CategoryValue = FOLDER_CATEGORY[folder] ?? "власні огляди";
        const { digest: _digest, ...rest } = entry;
        return originalSet({ ...rest, data: { ...entry.data, category } });
      };
      await inner.load(ctx);
    },
  };
}

// Main reviews collection with rich custom fields set
const reviews = defineCollection({
  loader: reviewsLoader(),
  schema: ({ image }) =>
    z.object({
      // article metadata
      publishedAt: z.date().nullish(),
      updatedAt: z.date().nullish(),
      aliases: z.array(z.string()).min(1),
      summary: z.string().nullish(),
      category: categoryType.default("власні огляди"),
      author: z.string().default(SITE.author),
      sponsor: z.array(z.string()).nullish(),
      tags: z.array(z.string()).nullish().default([]),
      pinned: z.boolean().optional(),
      canonicalURL: z.string().optional(),
      hidden: z.boolean().optional(),
      status: statusType.default("prebuild"),
      cover: image().nullish(),
      gallery: z.array(image()).nullish(),

      // tg posts content
      contentTgPosts: z.array(z.string()).optional(),

      // taxonomy fields
      brand: z.string().nullish(), // custom field for drink brand
      types: z.array(beverageType), // custom field for drink type
      taste: z.array(z.string()).nullish(), // e.g. orange, tropical, citrus
      favorite: z.boolean().nullish(), // whether it's a favorite drink
      container: z.array(containerType).nullish(), // custom field for packaging type
      sweeteners: z.array(z.string()).nullish(), // e.g. sugar, aspartame, sucralose
      availability: z.number().min(0).max(5).nullish(), // 0-5 rating for availability in local stores
      primaryColors: z.array(z.string()).nullish(), // e.g. red, green, blue
      manufacturer: z.string().nullish(), // custom field for drink manufacturer
      caffeine: z.number().min(14).max(100).nullish(), // mg per 100ml
      alco: z.number().min(0).max(50).nullish(), // alcohol percentage
      volume: z.array(volumeType).nullish(), // liters
      packager: packagerType.nullish(), // custom field for drink packager

      // custom field for related posts
      relatedPosts: z.array(z.string()).optional().default([]),
    }),
});

// Simple articles collection with rich custom fields set
const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: `./${POSTS_PATH}` }),
  schema: ({ image }) =>
    z.object({
      // article metadata
      publishedAt: z.date(),
      updatedAt: z.date().nullish(),
      aliases: z.array(z.string()).min(1),
      summary: z.string().optional(),
      author: z.string().default(SITE.author),
      pinned: z.boolean().optional(),
      hidden: z.boolean().optional(),
      canonicalURL: z.string().optional(),
      status: statusType.default("prebuild"),
      // article media
      ogImage: image().optional(),
      gallery: z.array(image()).nullish().default([]),
      // custom fields
      relatedPosts: z.array(z.string()).nullish().default([]),
    }),
});

export const collections = { reviews, posts };
