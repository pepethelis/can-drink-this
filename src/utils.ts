import type { ImageMetadata } from "astro";

export const normalizeMediaLink = (value: string) => {
  const trimmed = value.trim().replace(/^\.\/+/, "");
  const match = trimmed.match(/\[\[(.+?)\]\]/);
  if (match) return match[1].trim();
  return trimmed.replace(/^\[\[|\]\]$/g, "").trim();
};

export const resolveImageAsset = (
  value: undefined | string | ImageMetadata,
  imageAssets: Record<string, unknown>
) => {
  if (!value) return undefined;
  if (typeof value !== "string") return value;

  const normalized = normalizeMediaLink(value);
  if (normalized.startsWith("http") || normalized.startsWith("/")) {
    return normalized;
  }

  const normalizedSrc = normalized.replace(/^\.\//, "");
  const match = Object.entries(imageAssets).find(([path]) =>
    path.endsWith(`/${normalizedSrc}`)
  );
  if (match) return match[1] as ImageMetadata;

  return normalized;
};

export const resolveImageSrc = (
  src: string,
  imageAssets: Record<string, unknown>
) => {
  if (src.startsWith("http") || src.startsWith("/")) return src;

  const normalizedSrc = src.replace(/^\.\//, "");

  const match = Object.entries(imageAssets).find(([path]) =>
    path.endsWith(`/${normalizedSrc}`)
  );
  if (match) {
    return match[1] as string;
  }
  return src;
};

export const resolveVideoSrc = (
  src: string,
  videoAssets: Record<string, unknown>
) => {
  if (src.startsWith("http") || src.startsWith("/")) return src;

  const normalizedSrc = src.replace(/^\.\//, "");

  // Find matching video asset
  const match = Object.entries(videoAssets).find(([path]) =>
    path.endsWith(`/${normalizedSrc}`)
  );
  if (match) {
    return match[1] as string;
  }
  return src;
};

export const isVideo = (src: string) =>
  [".mp4", ".webm", ".ogg"].some(ext => src.toLowerCase().endsWith(ext));
