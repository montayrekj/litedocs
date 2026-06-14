import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plainTextToTipTap } from "@/lib/editor/plainTextToTipTap";
import { z } from "zod";

const SUPPORTED_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];
const SUPPORTED_EXTS = [".txt", ".md"];
const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  let title: string;
  let text: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name;
    const ext = "." + fileName.split(".").pop()?.toLowerCase();
    const mimeType = file.type;

    const isValidExt = SUPPORTED_EXTS.includes(ext);
    const isValidMime =
      SUPPORTED_TYPES.includes(mimeType) || mimeType === "";

    if (!isValidExt || !isValidMime) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Only ${SUPPORTED_EXTS.join(", ")} files are supported.`,
        },
        { status: 422 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 1 MB." },
        { status: 422 }
      );
    }

    text = await file.text();
    title = fileName.replace(/\.(txt|md)$/i, "") || "Imported Document";
  } else {
    // JSON body fallback
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid request" },
        { status: 422 }
      );
    }
    title = parsed.data.title;
    text = parsed.data.text;
  }

  const content = plainTextToTipTap(text);

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title, content })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, title: data.title }, { status: 201 });
}
