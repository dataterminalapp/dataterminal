import { JSONContent } from "@tiptap/react";

export function extractTextFromTiptapJSON(json: JSONContent): {
  text: string;
  mentions: Array<{ id: string; label: string }>;
} {
  if (!json || !json.content)
    return {
      text: "",
      mentions: [],
    };
  const mentions: Array<{ id: string; label: string }> = [];

  function traverse(nodes: JSONContent[]): string {
    return nodes
      .map((node) => {
        if (node.type === "text" && node.text) return node.text;
        if (node.type === "mention" && node.attrs) {
          mentions.push({
            id: node.attrs.id,
            label: node.attrs.label,
          });
          return `<@${node.attrs.id}|${node.attrs.label}>`;
        }
        if (node.content) return traverse(node.content);
        return "";
      })
      .join(" ");
  }

  return {
    text: traverse(json.content).trim(),
    mentions,
  };
}
