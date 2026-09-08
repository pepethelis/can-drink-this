import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { generateOgImageForSite } from "@/utils/generateOgImages";
import getUniqueTags from "@/utils/getUniqueTags";
import { tagDescription } from "@/pageMeta";

export const getStaticPaths = (async () => {
  // Unfiltered, to match the tag pages in `src/pages/tags/[...tag]/[...page].astro`
  // so every generated tag page has a matching image.
  const reviews = await getCollection("reviews");
  return getUniqueTags(reviews).map(({ tag, tagName }) => ({
    params: { tag },
    props: { tagName },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const tagName = props.tagName as string;
  const buffer = await generateOgImageForSite(
    `Tag: ${tagName}`,
    tagDescription(tagName)
  );
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
