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

  const { value: rawHtml, messages } = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: MAMMOTH_STYLE_MAP,
      // mammoth.images.imgElement is the correct API — confirmed accessible at runtime.
      // Cast through any because TypeScript's mammoth type defs don't expose .images.
      // The callback receives an image element; return { src } and mammoth wraps it in <img>.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      convertImage: (mammoth as any).images.imgElement(
        async (image: { read: (enc: string) => Promise<string>; contentType: string }) => {
          try {
            const base64 = await image.read("base64");
            return { src: `data:${image.contentType};base64,${base64}` };
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

  const tiptapJson = generateJSON(html, [
    // @ts-expect-error — underline may be bundled in StarterKit at runtime
    StarterKit.configure({ underline: false }),
    UnderlineExtension,
    ImageExtension,
  ]);

  return NextResponse.json({ json: tiptapJson, warnings });
}
