import { Resvg } from "@resvg/resvg-js";
import { type CollectionEntry } from "astro:content";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import postOgImage from "./og-templates/post";
import reviewOgImage from "./og-templates/review";
import siteOgImage from "./og-templates/site";

const projectRoot = process.cwd();
const assetsRoot = path.resolve(projectRoot, "src/data/assets");

function svgBufferToPngBuffer(svg: string) {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return pngData.asPng();
}

function stripObsidianSyntax(value: string): string {
  const match = value.trim().match(/\[\[(.+?)\]\]/);
  return match ? match[1].trim() : value.trim();
}

function findAssetByFilename(basename: string): string | undefined {
  if (!fs.existsSync(assetsRoot)) return undefined;
  const walk = (dir: string): string | undefined => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(fullPath);
        if (found) return found;
      } else if (entry.isFile() && entry.name === basename) {
        return fullPath;
      }
    }
    return undefined;
  };
  return walk(assetsRoot);
}

async function imageToBase64DataUrl(filePath: string): Promise<string> {
  const raw = fs.readFileSync(filePath);
  // Auto-rotate, then crop to right-panel dimensions so the data URL stays small
  const buffer = await sharp(raw)
    .rotate()
    .resize(480, 630, { fit: "cover", position: "center" })
    .jpeg({ quality: 82 })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function resolveOgImageBase64(ogImage: unknown): Promise<string | undefined> {
  if (!ogImage) return undefined;

  let filename: string;
  if (typeof ogImage === "string") {
    const normalized = stripObsidianSyntax(ogImage);
    filename = path.basename(normalized);
  } else if (
    typeof ogImage === "object" &&
    ogImage !== null &&
    "src" in ogImage
  ) {
    const src = (ogImage as { src: string }).src;
    filename = path.basename(src.split("?")[0]);
  } else {
    return undefined;
  }

  const filePath = findAssetByFilename(filename);
  if (!filePath) return undefined;
  return imageToBase64DataUrl(filePath);
}

export async function generateOgImageForPost(
  post: CollectionEntry<"posts">
) {
  const imageBase64 = await resolveOgImageBase64(post.data.ogImage);
  const svg = await postOgImage(post, imageBase64);
  return svgBufferToPngBuffer(svg);
}

export async function generateOgImageForReview(
  post: CollectionEntry<"reviews">
) {
  try {
    const imageBase64 = await resolveOgImageBase64(post.data.cover);
    const svg = await reviewOgImage(post, imageBase64);
    return svgBufferToPngBuffer(svg);
  } catch (err) {
    console.warn(
      `[OG] Failed to generate review image for "${post.id}", falling back to post template:`,
      err
    );
    const svg = await postOgImage(post);
    return svgBufferToPngBuffer(svg);
  }
}

export async function generateOgImageForSite() {
  const svg = await siteOgImage();
  return svgBufferToPngBuffer(svg);
}
