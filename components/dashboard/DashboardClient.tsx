"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/lib/documents/actions";
import { toast } from "@/components/ui/Toaster";
import { FileText, Plus, Trash2, Clock, Share2 } from "lucide-react";
import Link from "next/link";
import ImportFileButton from "@/components/dashboard/ImportFileButton";
import type { DocumentWithOwnership } from "@/lib/types";

interface Props {
  user: { id: string; email: string };
  myDocuments: DocumentWithOwnership[];
  sharedDocuments: DocumentWithOwnership[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DocumentCard({
  doc,
  onDelete,
  onRename,
}: {
  doc: DocumentWithOwnership;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link
          href={`/documents/${doc.id}`}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <FileText className="h-5 w-5 text-blue-500 shrink-0" />
          <span className="font-medium text-gray-900 truncate text-sm">
            {doc.title}
          </span>
        </Link>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {doc.isOwner && (
            <>
              <button
                onClick={() => onRename(doc.id, doc.title)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Rename"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(doc.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="h-3 w-3" />
          <span>{formatDate(doc.updated_at)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!doc.isOwner && (
            <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
              <Share2 className="h-2.5 w-2.5" />
              Shared
            </span>
          )}
          {doc.isOwner && (
            <span className="inline-flex items-center text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              Owner
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RenameModal({
  docId,
  currentTitle,
  onClose,
  onSave,
}: {
  docId: string;
  currentTitle: string;
  onClose: () => void;
  onSave: (id: string, title: string) => void;
}) {
  const [title, setTitle] = useState(currentTitle);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rename document</h2>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(docId, title);
            if (e.key === "Escape") onClose();
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(docId, title)}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SignOutButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const { signOut } = await import("@/lib/documents/actions");
          await signOut();
        })
      }
      disabled={isPending}
      className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export default function DashboardClient({ user, myDocuments, sharedDocuments }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleCreate() {
    startTransition(async () => {
      try {
        const doc = await createDocument();
        router.push(`/documents/${doc.id}`);
      } catch {
        toast("Failed to create document", "error");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteDocument(id);
        toast("Document deleted", "success");
      } catch {
        toast("Failed to delete document", "error");
      } finally {
        setDeletingId(null);
        router.refresh();
      }
    });
  }

  function handleRenameOpen(id: string, title: string) {
    setRenameTarget({ id, title });
  }

  function handleRenameSave(id: string, title: string) {
    if (!title.trim()) return;
    setRenameTarget(null);
    startTransition(async () => {
      try {
        await updateDocument(id, { title: title.trim() });
        toast("Renamed successfully", "success");
        router.refresh();
      } catch {
        toast("Failed to rename document", "error");
      }
    });
  }

  const allDocs = [
    ...myDocuments.map((d) => ({ ...d, isOwner: true as const })),
    ...sharedDocuments.map((d) => ({ ...d, isOwner: false as const })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">Ajaia Docs</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Actions bar */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <div className="flex items-center gap-3">
            <ImportFileButton onImported={() => router.refresh()} />
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New document
            </button>
          </div>
        </div>

        {/* My documents section */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Owned by me
          </h2>
          {myDocuments.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">No documents yet</p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create your first document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDelete}
                  onRename={handleRenameOpen}
                />
              ))}
            </div>
          )}
        </section>

        {/* Shared with me section */}
        {sharedDocuments.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Shared with me
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDelete}
                  onRename={handleRenameOpen}
                />
              ))}
            </div>
          </section>
        )}

        {allDocs.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-16">
            No documents yet — create or import one to get started.
          </p>
        )}
      </main>

      {renameTarget && (
        <RenameModal
          docId={renameTarget.id}
          currentTitle={renameTarget.title}
          onClose={() => setRenameTarget(null)}
          onSave={handleRenameSave}
        />
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 shadow-lg text-sm text-gray-700">
            Deleting…
          </div>
        </div>
      )}
    </div>
  );
}
