import type { APIRoute, GetStaticPaths } from "astro";
import { generateOgImageForSite } from "@/utils/generateOgImages";
import { PAGE_META, type PageMeta } from "@/pageMeta";

export const getStaticPaths = (() =>
  Object.entries(PAGE_META).map(([slug, meta]) => ({
    params: { slug },
    props: { meta },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { title, description } = props.meta as PageMeta;
  const buffer = await generateOgImageForSite(title, description);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
