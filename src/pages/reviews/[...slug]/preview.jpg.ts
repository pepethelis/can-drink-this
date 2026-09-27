import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import { generatePreviewImageForReview } from "@/utils/generatePreviewImage";
import postFilter from "@/utils/postFilter";

export async function getStaticPaths() {
  const reviews = await getCollection("reviews", postFilter);

  return reviews.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false) },
    props: post,
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
