import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import { visit } from "unist-util-visit";
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
let contentIndex:
  | {
      bySlug: Map<string, { base: string; path: string }[]>;
      byFull: Map<string, { base: string; path: string }>;
    }
  | undefined;
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
  const bySlug = new Map<string, { base: string; path: string }[]>();
  const byFull = new Map<string, { base: string; path: string }>();

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
      const folderSegments = segments.filter(Boolean).map(segment => slugifyStr(segment));
      const slug = slugifyStr(name);
      const full = [...folderSegments, slug].filter(Boolean).join("/");
      const entryInfo = { base, path: full };

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
  const trimmed = normalized.replace(/\/index$/, "");
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
  site: SITE.website,
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
