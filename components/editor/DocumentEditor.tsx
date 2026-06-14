"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "./ImageExtension";
import EditorToolbar from "./EditorToolbar";
import { useCallback, useEffect, useRef } from "react";
import { updateDocument } from "@/lib/documents/actions";
import type { TipTapDoc } from "@/lib/types";

interface Props {
  documentId: string;
  initialContent: TipTapDoc | null;
  importedContent?: TipTapDoc | null;
  onSaveStatusChange: (status: "saved" | "saving" | "error") => void;
  onImportDone?: () => void;
}

export default function DocumentEditor({
  documentId,
  initialContent,
  importedContent,
  onSaveStatusChange,
  onImportDone,
}: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitle = useRef<string | undefined>(undefined);

  const debouncedSave = useCallback(
    (content: TipTapDoc) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      onSaveStatusChange("saving");
      saveTimer.current = setTimeout(async () => {
        // ProseMirror's toJSON() produces null-prototype objects for attrs,
        // which React Flight (Next.js server action serialization) can silently
        // drop. Round-tripping through JSON converts them to plain objects.
        const safeContent: TipTapDoc = JSON.parse(JSON.stringify(content));
        try {
          await updateDocument(documentId, {
            content: safeContent,
            ...(latestTitle.current !== undefined
              ? { title: latestTitle.current }
              : {}),
          });
          onSaveStatusChange("saved");
        } catch {
          onSaveStatusChange("error");
        }
      }, 800);
    },
    // onSaveStatusChange must be memoized in parent (useCallback) to keep this stable
    [documentId, onSaveStatusChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable StarterKit's bundled underline if present to avoid duplicate warning
        // @ts-expect-error — underline is not in StarterKit types but may be included at runtime
        underline: false,
      }),
      UnderlineExtension,
      ImageExtension.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({
        placeholder: "Start writing…",
      }),
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] px-8 py-6",
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getJSON() as TipTapDoc);
    },
    immediatelyRender: false,
  });

  // Keep a stable ref to onImportDone so the cleanup inside setTimeout
  // always calls the latest version without needing to be in the effect deps.
  const onImportDoneRef = useRef(onImportDone);
  useEffect(() => { onImportDoneRef.current = onImportDone; }, [onImportDone]);

  // Append imported content at end, restore cursor, then signal parent to clear state.
  // setTimeout defers out of React's concurrent render cycle so TipTap's internal
  // flushSync call doesn't conflict and editor.getJSON() sees the committed state.
  // The cleanup only cancels the 0 ms timer (already fired by the time the parent
  // re-renders with importedContent=null), so the 800 ms debouncedSave is unaffected.
  useEffect(() => {
    if (!importedContent || !editor) return;
    const id = setTimeout(() => {
      const savedPos = editor.state.selection.anchor;
      const endPos = editor.state.doc.content.size;
      editor
        .chain()
        .insertContentAt(endPos, importedContent.content)
        .setTextSelection(savedPos)
        .run();
      debouncedSave(editor.getJSON() as TipTapDoc);
      onImportDoneRef.current?.();
    }, 0);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedContent]);

  // Expose a way for the parent to trigger title-inclusive saves
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__editorLatestTitle = (title: string) => {
      latestTitle.current = title;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
