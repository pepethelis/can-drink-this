import crypto from "node:crypto";
import fs from "node:fs";
import { resolveCoverFilePath } from "./generatePreviewImage";

/*
 * `cacheKey` helpers for `experimental.incrementalBuild`.
 *
 * Astro already re-renders a route when its own code or any module it imports
 * changes. The key only has to cover the *data* a generated image depends on:
 * the entry fields it draws, plus the bytes of the cover photo — the photo is
 * read with `fs` at render time, so Astro can't see it in the module graph.
 *
 * Hash file contents, not mtimes: a fresh git checkout in CI resets every
 * mtime and would invalidate the whole cache.
 */

const fileHashes = new Map<string, string>();

function hashFile(filePath: string): string {
  let hash = fileHashes.get(filePath);
  if (!hash) {
    hash = crypto
      .createHash("sha1")
      .update(fs.readFileSync(filePath))
      .digest("hex");
    fileHashes.set(filePath, hash);
  }
  return hash;
}

/**
 * Builds a cache key from the values an image renders plus the content hash
 * of its cover/photo file (when one resolves).
 */
export function imageCacheKey(fields: unknown, cover?: unknown): string {
  const coverPath = resolveCoverFilePath(cover);
  return crypto
    .createHash("sha1")
    .update(JSON.stringify(fields ?? null))
    .update(coverPath ? hashFile(coverPath) : "no-cover")
    .digest("hex");
}
