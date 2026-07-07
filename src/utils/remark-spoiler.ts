import type { Html, Parent, PhrasingContent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

export default function remarkSpoiler() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (
        !parent ||
        typeof index !== "number" ||
        typeof node.value !== "string"
      ) {
        return;
      }

      const regex = /\|\|(.+?)\|\|/g;
      let match;
      let lastIndex = 0;
      const newNodes: PhrasingContent[] = [];

      while ((match = regex.exec(node.value)) !== null) {
        const [full, content] = match;

        if (match.index > lastIndex) {
          const textNode: Text = {
            type: "text",
            value: node.value.slice(lastIndex, match.index),
          };
          newNodes.push(textNode);
        }

        const htmlNode: Html = {
          type: "html",
          value: `<span class="spoiler">${content}</span>`,
        };
        newNodes.push(htmlNode);

        lastIndex = match.index + full.length;
      }

      if (lastIndex < node.value.length) {
        const textNode: Text = {
          type: "text",
          value: node.value.slice(lastIndex),
        };
        newNodes.push(textNode);
      }

      if (newNodes.length > 0) {
        const children = (parent as Parent).children as PhrasingContent[];
        children.splice(index, 1, ...newNodes);
      }
    });
  };
}
