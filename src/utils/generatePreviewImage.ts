import { type CollectionEntry } from "astro:content";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { resolveImageFilePath } from "./generateOgImages";

const projectRoot = process.cwd();
const PREVIEW_SIZE = 300;

/** Local file behind a review cover; see resolveImageFilePath. */
export function resolveCoverFilePath(cover: unknown): string | undefined {
  return resolveImageFilePath(cover);
}

export async function generatePreviewImageForReview(
  post: CollectionEntry<"reviews">
) {
  const coverFilePath = resolveCoverFilePath(post.data.cover);
  const isOwn = post.data.category === "власні огляди";
  const filePath =
    coverFilePath ??
    path.resolve(
      projectRoot,
      `src/assets/images/${isOwn ? "default.png" : "default2.png"}`
    );

  const raw = fs.readFileSync(filePath);
  return sharp(raw)
    .rotate()
    .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: "cover", position: "center" })
    .jpeg({ quality: 78 })
    .toBuffer();
}
