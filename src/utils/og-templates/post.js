import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts, { loadAdditionalAsset } from "../loadGoogleFont";

export default async (post, imageBase64) => {
  const title = post.data.aliases?.[0] ?? post.data.title ?? "";
  const summary = post.data.summary ?? "";
  const author = post.data.author ?? "";
  const hasImage = Boolean(imageBase64);

  const fontSize = title.length > 40 ? 48 : title.length > 25 ? 58 : 70;

  const textPanel = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 52px",
        width: hasImage ? "60%" : "100%",
        height: "100%",
      },
      children: [
        {
          type: "span",
          props: {
            style: {
              fontSize: 18,
              fontWeight: 700,
              color: "#6b7280",
              letterSpacing: "0.1em",
            },
            children: SITE.title.toUpperCase(),
          },
        },
        {
          type: "p",
          props: {
            style: {
              fontSize,
              fontWeight: 700,
              color: "#f9fafb",
              lineHeight: 1.2,
              margin: 0,
              maxHeight: "40%",
              overflow: "hidden",
            },
            children: title,
          },
        },
        summary
          ? {
              type: "p",
              props: {
                style: {
                  fontSize: 22,
                  color: "#9ca3af",
                  lineHeight: 1.4,
                  margin: 0,
                  maxHeight: "15%",
                  overflow: "hidden",
                },
                children: summary,
              },
            }
          : { type: "span", props: { children: "" } },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: 20,
              color: "#9ca3af",
            },
            children: [
              { type: "span", props: { children: "by" } },
              {
                type: "span",
                props: {
                  style: { fontWeight: 700, color: "#d1d5db" },
                  children: author,
                },
              },
            ],
          },
        },
      ],
    },
  };

  const imagePanel = {
    type: "div",
    props: {
      style: {
        width: "40%",
        height: "100%",
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        borderLeft: "1px solid #1f2937",
      },
      children: {
        type: "img",
        props: {
          src: imageBase64,
          width: 480,
          height: 630,
          style: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          },
        },
      },
    },
  };

  const children = hasImage ? [textPanel, imagePanel] : [textPanel];

  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#0d1117",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
        },
        children,
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: await loadGoogleFonts(
        title + " " + summary + " " + author + " " + SITE.title + " " + SITE.title.toUpperCase()
      ),
      loadAdditionalAsset,
    }
  );
};
