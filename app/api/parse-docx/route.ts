import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import ImageExtension from "@tiptap/extension-image";
import { createClient } from "@/lib/supabase/server";

// Maps Word paragraph/run styles → HTML elements.
// Order matters: more specific rules should come first.
const MAMMOTH_STYLE_MAP = [
  // Headings
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",

  // Lists — map Word list-style paragraphs to proper HTML list elements
  "p[style-name='List Paragraph'] => li:fresh",
  "p[style-name='List Number'] => ol > li:fresh",
  "p[style-name='List Number 2'] => ol > li:fresh",
  "p[style-name='List Number 3'] => ol > li:fresh",
  "p[style-name='List Bullet'] => ul > li:fresh",
  "p[style-name='List Bullet 2'] => ul > li:fresh",
  "p[style-name='List Bullet 3'] => ul > li:fresh",

  // Inline formatting
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "r[style-name='Intense Emphasis'] => em > strong",
].join("\n");

function cleanHtml(html: string): string {
  return (
    html
      // Collapse 3+ consecutive empty <p> tags into a single one
      .replace(/(<p><\/p>\s*){3,}/g, "<p></p>")
      // Remove Word's explicit line break artifacts that become orphan <br>-only paragraphs
      .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "")
  );
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".docx")) {
    return NextResponse.json({ error: "Only .docx files are supported" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload each extracted image to Supabase Storage and map placeholder → public URL.
  // This avoids embedding large base64 strings in the document content (they get silently
  // dropped when passing through the Next.js server action serialization layer).
  const imageDataMap = new Map<string, string>();
  let imageCounter = 0;

  async function uploadDocxImage(
    base64: string,
    contentType: string,
    index: number
  ): Promise<string> {
    try {
      const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const path = `${user.id}/${Date.now()}-${index}.${ext}`;
      const imageBuffer = Buffer.from(base64, "base64");

      const { error } = await supabase.storage
        .from("document-images")
        .upload(path, imageBuffer, { contentType, upsert: false });

      if (error) throw error;

      const { data } = supabase.storage
        .from("document-images")
        .getPublicUrl(path);

      return data.publicUrl;
    } catch {
      // Storage not available — fall back to inline base64
      return `data:${contentType};base64,${base64}`;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { value: rawHtml, messages } = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: MAMMOTH_STYLE_MAP,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      convertImage: (mammoth as any).images.imgElement(
        async (image: { read: (enc: string) => Promise<string>; contentType: string }) => {
          try {
            const base64 = await image.read("base64");
            const idx = imageCounter++;
            const placeholder = `__docx_img_${idx}__`;
            const src = await uploadDocxImage(base64, image.contentType, idx);
            imageDataMap.set(placeholder, src);
            return { src: placeholder };
          } catch {
            return { src: "" };
          }
        }
      ),
    }
  );

  const html = cleanHtml(rawHtml);

  const warnings = messages
    .filter((m) => m.type === "warning")
    .map((m) => m.message);

  const rawJson = generateJSON(html, [
    // @ts-expect-error — underline may be bundled in StarterKit at runtime
    StarterKit.configure({ underline: false }),
    UnderlineExtension,
    ImageExtension,
  ]);

  // Swap placeholder srcs back to real base64 data URIs now that the DOM
  // has finished parsing (avoids attribute truncation in the virtual DOM).
  function patchImageNodes(node: Record<string, unknown>): Record<string, unknown> {
    if (
      node.type === "image" &&
      node.attrs &&
      typeof (node.attrs as Record<string, unknown>).src === "string"
    ) {
      const placeholder = (node.attrs as Record<string, string>).src;
      if (imageDataMap.has(placeholder)) {
        return {
          ...node,
          attrs: { ...(node.attrs as object), src: imageDataMap.get(placeholder) },
        };
      }
    }
    if (Array.isArray(node.content)) {
      return { ...node, content: (node.content as Record<string, unknown>[]).map(patchImageNodes) };
    }
    return node;
  }

  const tiptapJson = patchImageNodes(rawJson as Record<string, unknown>);

  return NextResponse.json({ json: tiptapJson, warnings });
}
