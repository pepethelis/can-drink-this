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
  const folder = encodeURIComponent(cldr.charAt(0).toUpperCase() + cldr.slice(1));
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

async function loadGoogleFont(
  font: string,
  text: string,
  weight: number
): Promise<ArrayBuffer> {
  const API = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&text=${encodeURIComponent(text)}`;

  const css = await (
    await fetch(API, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    })
  ).text();

  const resource = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/
  );

  if (!resource) throw new Error("Failed to download dynamic font");

  const res = await fetch(resource[1]);

  if (!res.ok) {
    throw new Error("Failed to download dynamic font. Status: " + res.status);
  }

  const buffer = await res.arrayBuffer();

  // Validate TTF (0x00010000) or OTF (OTTO) magic bytes
  if (buffer.byteLength < 4) {
    throw new Error("Font buffer too small — likely a truncated response");
  }
  const magic = new DataView(buffer).getUint32(0, false);
  if (magic !== 0x00010000 && magic !== 0x4f54544f) {
    throw new Error(
      `Invalid font data (magic 0x${magic.toString(16).padStart(8, "0")}) — Google Fonts may have returned an error page`
    );
  }

  return buffer;
}

async function loadGoogleFonts(
  text: string
): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>
> {
  const fontsConfig = [
    {
      name: "IBM Plex Mono",
      font: "IBM+Plex+Mono",
      weight: 400,
      style: "normal",
    },
    {
      name: "IBM Plex Mono",
      font: "IBM+Plex+Mono",
      weight: 700,
      style: "bold",
    },
  ];

  const fonts = await Promise.all(
    fontsConfig.map(async ({ name, font, weight, style }) => {
      const data = await loadGoogleFont(font, text, weight);
      return { name, data, weight, style };
    })
  );

  return fonts;
}

export default loadGoogleFonts;
