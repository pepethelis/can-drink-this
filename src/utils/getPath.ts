import { REVIEWS_PATH, POSTS_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";

/**
 * Get full path of a blog post
 * @param id - id of the blog post (aka slug)
 * @param filePath - the blog post full file location
 * @param includeBase - whether to include `/posts` or `/reviews` in return value
 * @returns blog post path
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true
) {
  const normalizedFilePath = filePath?.replace(/\\/g, "/");
  const normalizedId = id.replace(/^\//, "");
  const trimmedId = normalizedId.replace(/^(posts|reviews)\//, "");

  const pathSegments = normalizedFilePath
    ?.replace(REVIEWS_PATH, "")
    ?.replace(POSTS_PATH, "")
    .split("/")
    .filter(path => path !== "") // remove empty string in the segments ["", "other-path"] <- empty string will be removed
    .filter(path => !path.startsWith("_")) // exclude directories start with underscore "_"
    .slice(0, -1) // remove the last segment_ file name_ since it's unnecessary
    .map(segment => slugifyStr(segment)); // slugify each segment path

  const idSegments = trimmedId.split("/").filter(Boolean);
  const derivedPathSegments =
    pathSegments ?? idSegments.slice(0, -1).map(segment => slugifyStr(segment));

  const isReviewPath =
    normalizedFilePath?.includes(REVIEWS_PATH) ||
    normalizedId.startsWith("reviews/");
  const isPostPath =
    normalizedFilePath?.includes(POSTS_PATH) ||
    normalizedId.startsWith("posts/");
  const contentBase = isReviewPath ? "reviews" : isPostPath ? "posts" : "posts";

  const basePath = includeBase ? contentBase : "";
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/g, "");

  // Making sure `id` does not contain the directory
  const blogId = trimmedId.split("/");
  const slug = blogId.length > 0 ? blogId.slice(-1) : blogId;

  const normalizedSlug = Array.isArray(slug) ? slug[0] : slug;
  const safePathSegments = derivedPathSegments?.filter(
    segment => segment !== normalizedSlug
  );
  const slugPath = [...(safePathSegments ?? []), normalizedSlug].join("/");

  if (!includeBase) {
    return slugPath;
  }

  const joinedPath = [baseUrl, basePath, slugPath].filter(Boolean).join("/");
  return joinedPath.startsWith("/") ? joinedPath : `/${joinedPath}`;
}
