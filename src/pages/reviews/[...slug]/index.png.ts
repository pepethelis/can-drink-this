import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import { generateOgImageForReview } from "@/utils/generateOgImages";
import { SITE } from "@/config";
import { imageCacheKey } from "@/utils/imageCacheKey";

export async function getStaticPaths() {
  if (!SITE.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("reviews").then(p =>
    p.filter(({ data }) => !data.hidden)
  );

  return posts.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false) },
    props: post,
    // Only the fields the OG card draws (see og-templates/review.js) + cover.
    cacheKey: imageCacheKey(
      {
        aliases: post.data.aliases,
        summary: post.data.summary,
        category: post.data.category,
        types: post.data.types,
        author: post.data.author,
      },
      post.data.cover
    ),
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const buffer = await generateOgImageForReview(
    props as CollectionEntry<"reviews">
  );
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
