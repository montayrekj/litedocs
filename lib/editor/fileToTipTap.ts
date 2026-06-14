import { plainTextToTipTap } from "./plainTextToTipTap";
import type { TipTapDoc } from "@/lib/types";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"];
export const SUPPORTED_LABEL = ".txt, .md, .docx";
export const ACCEPT_ATTR = ".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function fileToTipTap(file: File): Promise<TipTapDoc> {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();

  if (ext === ".docx") {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/parse-docx", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
      throw new Error(error ?? "Failed to parse .docx file");
    }

    const { json } = await res.json();
    return json as TipTapDoc;
  }

  // .txt / .md — client-side
  const text = await file.text();
  return plainTextToTipTap(text);
}
