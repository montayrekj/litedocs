import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import { createClient } from "@/lib/supabase/server";

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

  const { value: html, messages } = await mammoth.convertToHtml({ buffer });

  const warnings = messages
    .filter((m) => m.type === "warning")
    .map((m) => m.message);

  const tiptapJson = generateJSON(html, [StarterKit, UnderlineExtension]);

  return NextResponse.json({ json: tiptapJson, warnings });
}
