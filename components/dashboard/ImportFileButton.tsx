"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "@/components/ui/Toaster";
import { plainTextToTipTap } from "@/lib/editor/plainTextToTipTap";
import { importDocument } from "@/lib/documents/actions";

const SUPPORTED = [".txt", ".md"];

export default function ImportFileButton({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);

  async function processFile(file: File) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED.includes(ext)) {
      toast(`Unsupported file type. Supports: ${SUPPORTED.join(", ")}`, "error");
      return;
    }

    const text = await file.text();
    const content = plainTextToTipTap(text);
    const title = file.name.replace(/\.(txt|md)$/i, "") || "Imported Document";

    startTransition(async () => {
      try {
        const doc = await importDocument(title, content);
        toast("File imported as new document", "success");
        onImported();
        router.push(`/documents/${doc.id}`);
      } catch {
        toast("Failed to import file", "error");
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`inline-flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
          dragging
            ? "border-blue-400 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
        title="Supports .txt and .md files"
      >
        <Upload className="h-4 w-4" />
        {isPending ? "Importing…" : "Import file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
