import fs from "node:fs";
import path from "node:path";
import emojiNameData from "unicode-emoji-json/data-by-emoji.json";

const emojiCache = new Map<string, string>();
const FLUENT_BASE =
  "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets";

type EmojiEntry = { name: string; skin_tone_support: boolean };

function fluentUrl(segment: string): string | undefined {
  // Try with variation selector first, then without (e.g. ❤️ → ❤)
  const db = emojiNameData as Record<string, EmojiEntry>;
  const entry = db[segment] ?? db[segment.replace(/️/gu, "")];
  if (!entry) return undefined;

  const cldr = entry.name;
  const folder = encodeURIComponent(
    cldr.charAt(0).toUpperCase() + cldr.slice(1)
  );
  // Strip parens so "A button (blood type)" → "a_button_blood_type"
  const baseName = cldr
    .replace(/[()]/g, "")
    .replace(/ +/g, "_")
    .replace(/_+/g, "_")
    .replace(/_$/, "");

  if (entry.skin_tone_support) {
    // Skin-tone-able emoji live under a Default/ tier
    return `${FLUENT_BASE}/${folder}/Default/Color/${baseName}_color_default.svg`;
  }
  return `${FLUENT_BASE}/${folder}/Color/${baseName}_color.svg`;
}

export async function loadAdditionalAsset(
  code: string,
  segment: string
): Promise<string | undefined> {
  if (code !== "emoji") return undefined;
  if (emojiCache.has(segment)) return emojiCache.get(segment)!;

  const url = fluentUrl(segment);
  if (!url) return undefined;

  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const svg = await res.text();
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    emojiCache.set(segment, dataUrl);
    return dataUrl;
  } catch {
    return undefined;
  }
}

// OG fonts are read from disk, not fetched from Google Fonts. Every OG image
// used to make 4 requests (CSS + TTF x 2 weights); with parallel prerendering
// hundreds of them ran at once, Google started dropping connections and a
// single "fetch failed" aborted the whole build in CI.
//
// IBM Plex Mono, SIL Open Font License 1.1 — see src/assets/fonts/OFL.txt.
const FONT_DIR = path.resolve(process.cwd(), "src/assets/fonts");

const fontsConfig = [
  {
    name: "IBM Plex Mono",
    file: "IBMPlexMono-Regular.ttf",
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "IBM Plex Mono",
    file: "IBMPlexMono-Bold.ttf",
    weight: 700 as const,
    style: "normal" as const,
  },
];

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

let fontsPromise: Promise<OgFont[]> | undefined;

async function readFont(file: string): Promise<ArrayBuffer> {
  const buf = await fs.promises.readFile(path.join(FONT_DIR, file));
  // Validate TTF (0x00010000) or OTF (OTTO) magic bytes
  const magic = buf.length >= 4 ? buf.readUInt32BE(0) : 0;
  if (magic !== 0x00010000 && magic !== 0x4f54544f) {
    throw new Error(`Invalid font file ${file}`);
  }
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Fonts for satori OG templates (full font files, loaded once per process).
 * Templates still pass the rendered text as an argument; it is not needed.
 */
async function loadGoogleFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all(
    fontsConfig.map(async ({ name, file, weight, style }) => ({
      name,
      data: await readFont(file),
      weight,
      style,
    }))
  ).catch(err => {
    fontsPromise = undefined;
    throw err;
  });
  return fontsPromise;
}

export default loadGoogleFonts;
