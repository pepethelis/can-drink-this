import type { CollectionEntry } from "astro:content";
import getSortedPosts from "./getSortedPosts";
import { slugifyAll } from "./slugify";

const getPostsByTag = (posts: CollectionEntry<"reviews">[], tag: string) =>
  getSortedPosts(
    posts.filter(post => {
      const normalizedTags = slugifyAll(post.data.tags ?? []);
      return normalizedTags.some(
        normalizedTag =>
          normalizedTag === tag || normalizedTag.startsWith(`${tag}/`)
      );
    })
  );

export default getPostsByTag;
