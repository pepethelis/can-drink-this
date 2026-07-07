import type { Image, Parent, PhrasingContent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";
import fs from "node:fs";
import path from "node:path";

const imagePattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const skipParentTypes = new Set(["code", "inlineCode", "html"]);
const projectRoot = process.cwd();
const assetsRoot = path.resolve(projectRoot, "src/data/assets");
const contentRoots = [
  path.resolve(projectRoot, "src/data/posts"),
  path.resolve(projectRoot, "src/data/reviews"),
];
let assetsIndex: Map<string, string[]> | null = null;

const getAltText = (path: string, fallback?: string) => {
  if (fallback && fallback.trim().length > 0) return fallback.trim();
  const fileName = path.split("/").pop() ?? path;
  return fileName.replace(/\.[^/.]+$/, "");
};

const toPosix = (value: string) => value.replace(/\\/g, "/");

const getFilePathFromVFile = (file?: {
  path?: string;
  history?: string[];
  data?: { astro?: Record<string, unknown> };
}) => {
  if (!file) return undefined;
  if (file.path) return file.path;
  if (file.history && file.history.length > 0) return file.history[0];
  const astro = file.data?.astro as Record<string, unknown> | undefined;
  const astroPath = astro?.filePath ?? astro?.source;
  return typeof astroPath === "string" ? astroPath : undefined;
};

const buildAssetsIndex = () => {
  if (!fs.existsSync(assetsRoot)) return new Map<string, string[]>();
  const map = new Map<string, string[]>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const rel = toPosix(path.relative(assetsRoot, fullPath));
        const name = entry.name;
        const list = map.get(name) ?? [];
        list.push(rel);
        map.set(name, list);
      }
    }
  };
  walk(assetsRoot);
  return map;
};

const resolveAssetUrl = (rawPath: string, filePath?: string) => {
  const trimmed = rawPath.trim();
  if (trimmed.startsWith("http") || trimmed.startsWith("/")) return trimmed;

  const assetsByName = assetsIndex ?? (assetsIndex = buildAssetsIndex());
  const directCandidate = path.resolve(assetsRoot, trimmed);
  let resolved = fs.existsSync(directCandidate)
    ? toPosix(path.relative(assetsRoot, directCandidate))
    : undefined;

  if (!resolved && !trimmed.includes("/")) {
    const matches = assetsByName.get(path.basename(trimmed)) ?? [];
    if (matches.length === 1) resolved = matches[0];
  }

  if (!resolved) return trimmed;

  if (!filePath) {
    const target = path.join(assetsRoot, resolved);
    const root = contentRoots.find(rootPath => fs.existsSync(rootPath));
    if (!root) return trimmed;
    let relative = toPosix(path.relative(root, target));
    if (!relative.startsWith(".") && !relative.startsWith("/")) {
      relative = `./${relative}`;
    }
    return relative;
  }

  const fromDir = path.dirname(filePath);
  const target = path.join(assetsRoot, resolved);
  let relative = toPosix(path.relative(fromDir, target));
  if (!relative.startsWith(".") && !relative.startsWith("/")) {
    relative = `./${relative}`;
  }
  return relative;
};

export default function remarkObsidianImage() {
  return (tree: Root, file: { path?: string; history?: string[]; data?: { astro?: Record<string, unknown> } }) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (skipParentTypes.has((parent as Parent).type)) return;
      if (typeof node.value !== "string" || !imagePattern.test(node.value)) return;

      imagePattern.lastIndex = 0;
      let match: RegExpExecArray | null = null;
      let lastIndex = 0;
      const newNodes: PhrasingContent[] = [];

      while ((match = imagePattern.exec(node.value)) !== null) {
        const [full, rawPath, rawAlt] = match;

        if (match.index > lastIndex) {
          newNodes.push({
            type: "text",
            value: node.value.slice(lastIndex, match.index),
          });
        }

        const imageNode: Image = {
          type: "image",
          url: resolveAssetUrl(rawPath, getFilePathFromVFile(file)),
          alt: getAltText(rawPath, rawAlt),
        };
        newNodes.push(imageNode);

        lastIndex = match.index + full.length;
      }

      if (lastIndex < node.value.length) {
        newNodes.push({
          type: "text",
          value: node.value.slice(lastIndex),
        });
      }

      if (newNodes.length > 0) {
        const children = (parent as Parent).children as PhrasingContent[];
        children.splice(index, 1, ...newNodes);
      }
    });
  };
}
