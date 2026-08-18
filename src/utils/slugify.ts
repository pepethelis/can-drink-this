import slugify from "slugify";

/**
 * Slugify a string and transliterate non-ASCII characters to ASCII.
 * This keeps URLs readable and portable across browsers and systems.
 */
export const slugifyStr = (str: string): string =>
  slugify(str, {
    lower: true,
    strict: true,
    trim: true,
  });

export const slugifyTagPath = (tag: string): string =>
  tag
    .split("/")
    .map(segment => slugifyStr(segment))
    .join("/");

export const slugifyAll = (arr: string[]) =>
  arr.map(str => slugifyTagPath(str));
