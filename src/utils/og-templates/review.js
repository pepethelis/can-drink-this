import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts, { loadAdditionalAsset } from "../loadGoogleFont";

export default async (post, imageBase64) => {
  const title = (post.data.aliases && post.data.aliases[0]) || "Без назви";
  const summary = post.data.summary || "";
  const category = post.data.category || "";
  const type = (post.data.types ?? []).join(", ");
  const isFriendly = category === "дружні огляди";
  const author = isFriendly ? (post.data.author || "") : "";
  const hasImage = Boolean(imageBase64);

  const fontSize = title.length > 40 ? 48 : title.length > 25 ? 58 : 70;

  const leftPanel = {
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
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
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
              flexDirection: "row",
              gap: "12px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontSize: 22,
                    color: "#9ca3af",
                  },
                  children: category,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    background: "#052e16",
                    border: "1px solid #166534",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontSize: 22,
                    color: "#4ade80",
                  },
                  children: type,
                },
              },
              ...(author
                ? [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          background: "#1c1a2e",
                          border: "1px solid #3730a3",
                          borderRadius: "8px",
                          padding: "10px 20px",
                          fontSize: 22,
                          color: "#a5b4fc",
                        },
                        children: "@" + author,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      ],
    },
  };

  const rightPanel = {
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

  const children = hasImage ? [leftPanel, rightPanel] : [leftPanel];

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
        title + " " + summary + " " + category + " " + type + " @" + author + " " + SITE.title + " " + SITE.title.toUpperCase()
      ),
      loadAdditionalAsset,
    }
  );
};
