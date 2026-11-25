import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import { generatePreviewImageForReview } from "@/utils/generatePreviewImage";
import postFilter from "@/utils/postFilter";
import { imageCacheKey } from "@/utils/imageCacheKey";

export async function getStaticPaths() {
  const reviews = await getCollection("reviews", postFilter);

  return reviews.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false) },
    props: post,
    // Category picks the fallback image when there is no cover.
    cacheKey: imageCacheKey({ category: post.data.category }, post.data.cover),
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const buffer = await generatePreviewImageForReview(
    props as CollectionEntry<"reviews">
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
