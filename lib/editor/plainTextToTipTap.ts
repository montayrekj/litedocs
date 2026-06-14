import type { TipTapDoc, TipTapNode } from "@/lib/types";

export function plainTextToTipTap(text: string): TipTapDoc {
  const lines = text.split("\n");

  const content: TipTapNode[] = lines.map((line) => {
    if (line.trim() === "") {
      return { type: "paragraph" };
    }

    // Detect markdown headings
    if (line.startsWith("# ")) {
      return {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: line.slice(2) }],
      };
    }
    if (line.startsWith("## ")) {
      return {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: line.slice(3) }],
      };
    }
    if (line.startsWith("### ")) {
      return {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: line.slice(4) }],
      };
    }

    // Detect markdown bullet lists
    if (/^[-*]\s/.test(line)) {
      return {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: line.slice(2) }],
              },
            ],
          },
        ],
      };
    }

    return {
      type: "paragraph",
      content: [{ type: "text", text: line }],
    };
  });

  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}
