import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import { visit } from "unist-util-visit";
import { parse as parseYaml } from "yaml";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import remarkWikiLink from "remark-wiki-link";
import remarkSpoiler from "./src/utils/remark-spoiler";
import remarkReadingTime from "./src/utils/remark-reading-time";
import remarkObsidianImage from "./src/utils/remark-obsidian-image";
import fs from "node:fs";
import path from "node:path";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";
import { slugifyStr } from "./src/utils/slugify";

const siteBase = SITE.base ? `/${SITE.base.replace(/^\/|\/$/g, "")}` : "";
const projectRoot = process.cwd();
const contentRoots = [
  { base: "posts", dir: path.resolve(projectRoot, "src/data/posts") },
  { base: "reviews", dir: path.resolve(projectRoot, "src/data/reviews") },
];
type ReviewPreviewMeta = {
  title: string;
  summary?: string;
  types?: string[];
  author: string;
  published: boolean;
};
type ContentIndexEntry = {
  base: string;
  path: string;
  preview?: ReviewPreviewMeta;
};
let contentIndex:
  | {
      bySlug: Map<string, ContentIndexEntry[]>;
      byFull: Map<string, ContentIndexEntry>;
    }
  | undefined;

// Reads just the `aliases` (title), `summary` and publish status frontmatter
// fields for internal review links — a lightweight read separate from the
// full Zod-validated content collection load. `published` mirrors
// src/utils/postFilter.ts's visibility rule, for links to reviews that don't
// exist yet or aren't out yet.
const readReviewPreviewMeta = (
  filePath: string,
  isOwnCategory: boolean
): ReviewPreviewMeta | undefined => {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return undefined;
    const data = parseYaml(match[1]) as Record<string, unknown>;
    const aliases = Array.isArray(data.aliases) ? data.aliases : [];
    const title = aliases.find(a => typeof a === "string") as
      | string
      | undefined;
    if (!title) return undefined;
    const summary = typeof data.summary === "string" ? data.summary : undefined;
    const types = Array.isArray(data.types)
      ? data.types.filter((t): t is string => typeof t === "string")
      : undefined;
    const author = typeof data.author === "string" ? data.author : SITE.author;

    const publishedAt =
      typeof data.publishedAt === "string" || data.publishedAt instanceof Date
        ? new Date(data.publishedAt)
        : undefined;
    const status = typeof data.status === "string" ? data.status : "prebuild";
    const blockedByStatus =
      isOwnCategory && ["prebuild", "to create", "to enrich"].includes(status);
    const published =
      Boolean(publishedAt && !Number.isNaN(publishedAt.getTime())) &&
      !blockedByStatus &&
      data.hidden !== true &&
      Date.now() > publishedAt!.getTime() - SITE.scheduledPostMargin;

    return { title, summary, types, author, published };
  } catch {
    return undefined;
  }
};
const withBase = (href: string) =>
  href.startsWith("/posts/") || href.startsWith("/reviews/")
    ? `${siteBase}${href}`
    : href;
const resolveWikiSlug = (name: string) =>
  name
    .split("/")
    .filter(Boolean)
    .map(segment => slugifyStr(segment))
    .join("/");
const buildContentIndex = () => {
  const bySlug = new Map<string, ContentIndexEntry[]>();
  const byFull = new Map<string, ContentIndexEntry>();

  const walk = (base: string, dir: string, rootDir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(base, fullPath, rootDir);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const relToRoot = path.relative(rootDir, fullPath).replace(/\\/g, "/");
      const segments = relToRoot.split("/");
      const fileName = segments.pop() ?? "";
      const name = fileName.replace(/\.md$/, "");
      const folderSegments = segments
        .filter(Boolean)
        .map(segment => slugifyStr(segment));
      const slug = slugifyStr(name);
      const full = [...folderSegments, slug].filter(Boolean).join("/");
      const entryInfo: ContentIndexEntry = { base, path: full };
      if (base === "reviews") {
        entryInfo.preview = readReviewPreviewMeta(
          fullPath,
          folderSegments[0] === "own"
        );
      }

      byFull.set(full, entryInfo);
      const list = bySlug.get(slug) ?? [];
      list.push(entryInfo);
      bySlug.set(slug, list);
    }
  };

  for (const root of contentRoots) {
    walk(root.base, root.dir, root.dir);
  }

  return { bySlug, byFull };
};
const resolveWikiHref = (input: string) => {
  const normalized = resolveWikiSlug(input).replace(/^\//, "");
  // The Obsidian vault's own root is a `content/` folder (see the Dockerfile's
  // `git archive ... content`), so wikilinks written as full vault-relative
  // paths carry that prefix, e.g. [[content/reviews/own/Foo]] — strip it
  // before matching against src/data/{reviews,posts}, which start one level in.
  const trimmed = normalized.replace(/\/index$/, "").replace(/^content\//, "");
  if (trimmed.startsWith("reviews/") || trimmed.startsWith("posts/")) {
    return `${siteBase}/${trimmed}`;
  }
  contentIndex = contentIndex ?? buildContentIndex();
  const directMatch = contentIndex.byFull.get(trimmed);
  if (directMatch) {
    return `${siteBase}/${directMatch.base}/${directMatch.path}`;
  }
  const slugMatches = contentIndex.bySlug.get(trimmed) ?? [];
  if (slugMatches.length === 1) {
    const match = slugMatches[0];
    return `${siteBase}/${match.base}/${match.path}`;
  }
  return `${siteBase}/posts/${trimmed}`;
};
// Flags a link as pointing at content that doesn't exist yet: appends a ⌛
// and drops the underline (see .link-pending in typography.css) instead of
// showing a hover-preview card.
const markLinkPending = (node: any) => {
  node.children = node.children || [];
  node.children.push({ type: "text", value: " ⌛" });
  const existingClassName = node.properties.className;
  const classNames = Array.isArray(existingClassName)
    ? existingClassName
    : typeof existingClassName === "string"
      ? existingClassName.split(" ").filter(Boolean)
      : [];
  node.properties.className = [...classNames, "link-pending"];
};
const rewriteWikiLinks = () => (tree: any) => {
  visit(tree, "wikiLink", (node: any) => {
    const rawValue = typeof node?.value === "string" ? node.value : "";
    if (!rawValue) return;
    const href = resolveWikiHref(rawValue);
    node.data = node.data || {};
    node.data.hProperties = node.data.hProperties || {};
    node.data.hProperties.href = withBase(href);
  });
};

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || SITE.website,
  base: SITE.base,
  trailingSlash: "never",
  integrations: [
    react(),
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkReadingTime,
      remarkToc,
      [remarkCollapse, { test: "Table of contents" }],
      remarkObsidianImage,
      [
        remarkWikiLink,
        {
          aliasDivider: "|",
          pageResolver: (name: string) => [resolveWikiSlug(name)],
          hrefTemplate: (permalink: string) => resolveWikiHref(permalink),
        },
      ],
      rewriteWikiLinks,
      remarkSpoiler,
    ],
    rehypePlugins: [
      () => tree => {
        visit(tree, "element", (node: any) => {
          if (!/^h[2-6]$/.test(node.tagName)) return;
          if (node.properties?.id) return;

          const text = node.children
            ?.filter((child: any) => child.type === "text")
            .map((child: any) => child.value)
            .join(" ")
            .trim();

          if (!text) return;
          node.properties = node.properties || {};
          node.properties.id = slugifyStr(text);
        });
      },
      () => tree => {
        visit(tree, "element", (node: any) => {
          if (node.tagName !== "a" || !node.properties?.href) return;
          const href = String(node.properties.href);
          node.properties.href = withBase(href);

          // Attach hover-preview data to internal links to other reviews so a
          // client-side script can show a title/summary/cover card on hover.
          const withoutSiteBase =
            siteBase && href.startsWith(siteBase)
              ? href.slice(siteBase.length)
              : href;

          const isReviewLink = withoutSiteBase.startsWith("/reviews/");
          const isPostLink = withoutSiteBase.startsWith("/posts/");
          if (!isReviewLink && !isPostLink) return;

          const slug = withoutSiteBase
            .replace(isReviewLink ? /^\/reviews\// : /^\/posts\//, "")
            .replace(/\/$/, "");
          // /reviews/awaited is a real static page, not a review slug — skip it.
          if (isReviewLink && slug === "awaited") return;

          contentIndex = contentIndex ?? buildContentIndex();
          const entry = contentIndex.byFull.get(slug);

          if (isPostLink) {
            // A short-form wikilink whose target doesn't match any review or
            // post falls back to /posts/<slug> (see resolveWikiHref) — if
            // nothing actually exists there either, it's the same "doesn't
            // exist yet" case as an unpublished review link.
            if (!entry) markLinkPending(node);
            return;
          }

          const review = entry?.base === "reviews" ? entry.preview : undefined;

          if (!review || !review.published) {
            // Link points at a review that doesn't exist yet or isn't
            // published — flag it visually instead of showing a hover card.
            markLinkPending(node);
            return;
          }

          node.properties["data-preview-title"] = review.title;
          if (review.summary) {
            node.properties["data-preview-summary"] = review.summary;
          }
          if (review.types && review.types.length > 0) {
            node.properties["data-preview-types"] = review.types.join(", ");
          }
          node.properties["data-preview-author"] = review.author;
          node.properties["data-preview-cover"] =
            `${siteBase}/reviews/${slug}/preview.jpg`;
        });
      },
    ],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    // eslint-disable-next-line
    // @ts-ignore
    // This will be fixed in Astro 6 with Vite 7 support
    // See: https://github.com/withastro/astro/issues/14030
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    preserveScriptOrder: true,
    fonts: [
      {
        name: "Fira Code",
        cssVariable: "--font-fira-code",
        provider: fontProviders.google(),
        fallbacks: ["monospace"],
        weights: [300, 400, 500, 600, 700],
        styles: ["normal", "italic"],
      },
    ],
  },
});
