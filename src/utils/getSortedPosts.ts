import type { CollectionEntry } from "astro:content";
import postFilter from "./postFilter";

const getSortedPosts = <
  T extends CollectionEntry<"reviews"> | CollectionEntry<"posts">,
>(
  posts: T[]
) => {
  return posts.filter(postFilter).sort((a, b) => {
    const aDate = new Date(a.data.updatedAt ?? a.data.publishedAt ?? new Date());
    const bDate = new Date(b.data.updatedAt ?? b.data.publishedAt ?? new Date());

    return (
      Math.floor(bDate.getTime() / 1000) - Math.floor(aDate.getTime() / 1000)
    );
  }) as T[];
};

export default getSortedPosts;
