import type { CollectionEntry } from "astro:content";
import { slugifyTagPath } from "./slugify";
import postFilter from "./postFilter";

interface Tag {
  tag: string;
  tagName: string;
}

const getUniqueTags = (posts: CollectionEntry<"reviews">[]) => {
  const seen = new Map<string, string>();

  posts
    .filter(postFilter)
    .flatMap(post => post.data.tags)
    .filter(Boolean)
    .forEach(tag => {
      if (!tag) return;
      const normalized = slugifyTagPath(tag);
      seen.set(normalized, tag);

      const parts = normalized.split("/").filter(Boolean);
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i += 1) {
          const parent = parts.slice(0, i).join("/");
          if (!seen.has(parent)) {
            seen.set(parent, parts.slice(0, i).join("/"));
          }
        }
      }
    });

  const tags: Tag[] = Array.from(seen, ([tag, tagName]) => ({
    tag,
    tagName,
  })).sort((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));

  return tags;
};

export default getUniqueTags;
