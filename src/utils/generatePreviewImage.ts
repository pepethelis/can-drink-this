import { type CollectionEntry } from "astro:content";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { findAssetByFilename, stripObsidianSyntax } from "./generateOgImages";

const projectRoot = process.cwd();
const PREVIEW_SIZE = 300;

function resolveCoverFilePath(cover: unknown): string | undefined {
  if (!cover) return undefined;

  let filename: string;
  if (typeof cover === "string") {
    filename = path.basename(stripObsidianSyntax(cover));
  } else if (typeof cover === "object" && cover !== null && "src" in cover) {
    filename = path.basename((cover as { src: string }).src.split("?")[0]);
  } else {
    return undefined;
  }

  return findAssetByFilename(filename);
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
