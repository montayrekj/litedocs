"use client";

import dynamic from "next/dynamic";
import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, AlertCircle, Share2 } from "lucide-react";
import { updateDocument } from "@/lib/documents/actions";
import { toast } from "@/components/ui/Toaster";
import ShareDocumentDialog from "@/components/sharing/ShareDocumentDialog";
import type { DocumentWithOwnership } from "@/lib/types";

const DocumentEditor = dynamic(() => import("./DocumentEditor"), { ssr: false });

type SaveStatus = "saved" | "saving" | "error" | "idle";

interface Props {
  document: DocumentWithOwnership;
  currentUser: { id: string; email: string };
}

export default function DocumentPageClient({ document, currentUser }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(document.title);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [, startTransition] = useTransition();
  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      // Pass title to editor's debounce context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__editorLatestTitle?.(newTitle);

      if (titleDebounce.current) clearTimeout(titleDebounce.current);
      setSaveStatus("saving");
      titleDebounce.current = setTimeout(() => {
        startTransition(async () => {
          try {
            await updateDocument(document.id, { title: newTitle });
            setSaveStatus("saved");
          } catch {
            setSaveStatus("error");
            toast("Failed to save title", "error");
          }
        });
      }, 800);
    },
    [document.id]
  );

  useEffect(() => {
    return () => {
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 focus:px-2 rounded-lg transition-all truncate"
              placeholder="Document title"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Save status indicator */}
            <div className="flex items-center gap-1.5 text-sm">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin" />
                  <span className="text-gray-400 text-xs">Saving…</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600 text-xs">Saved</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-red-600 text-xs">Save failed</span>
                </>
              )}
            </div>

            {/* Owner badge */}
            {document.isOwner ? (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Owner
              </span>
            ) : (
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                Shared
              </span>
            )}

            {/* Share button — owners only */}
            {document.isOwner && (
              <button
                onClick={() => setShowShareDialog(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <DocumentEditor
          documentId={document.id}
          initialContent={document.content}
          onSaveStatusChange={(s) => setSaveStatus(s)}
        />
      </main>

      {showShareDialog && (
        <ShareDocumentDialog
          documentId={document.id}
          onClose={() => setShowShareDialog(false)}
          onShared={() => {
            toast("Document shared successfully", "success");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
