"use client";

import { useState, useTransition, useEffect } from "react";
import { X, UserPlus, Trash2, Loader2 } from "lucide-react";
import { shareDocument, getDocumentShares, removeShare } from "@/lib/documents/actions";
import { z } from "zod";

interface ShareEntry {
  id: string;
  shared_with_user_id: string;
  role: string;
  profiles: { email: string; display_name: string | null } | null;
}

interface Props {
  documentId: string;
  onClose: () => void;
  onShared: () => void;
}

const emailSchema = z.string().email("Please enter a valid email address");

export default function ShareDocumentDialog({ documentId, onClose, onShared }: Props) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loadingShares, setLoadingShares] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getDocumentShares(documentId)
      .then((data) => setShares(data as ShareEntry[]))
      .catch(() => {})
      .finally(() => setLoadingShares(false));
  }, [documentId]);

  function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setShareError(null);

    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setEmailError(result.error.issues?.[0]?.message ?? "Invalid email");
      return;
    }

    startTransition(async () => {
      try {
        await shareDocument(documentId, email.trim());
        setEmail("");
        // Refresh share list
        const updated = await getDocumentShares(documentId);
        setShares(updated as ShareEntry[]);
        onShared();
      } catch (err: unknown) {
        setShareError(err instanceof Error ? err.message : "Failed to share document");
      }
    });
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      try {
        await removeShare(documentId, userId);
        setShares((prev) => prev.filter((s) => s.shared_with_user_id !== userId));
      } catch {
        setShareError("Failed to remove access");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Share document</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add collaborator form */}
        <form onSubmit={handleShare} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add collaborator by email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(null); setShareError(null); }}
              placeholder="user@example.com"
              className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                emailError ? "border-red-400" : "border-gray-300"
              }`}
            />
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Share
            </button>
          </div>

          {emailError && (
            <p className="text-xs text-red-600 mt-1">{emailError}</p>
          )}
          {shareError && (
            <p className="text-xs text-red-600 mt-1">{shareError}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            They will get editor access immediately.
          </p>
        </form>

        {/* Current shares */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            People with access
          </h3>

          {loadingShares ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : shares.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">
              Not shared with anyone yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-gray-900">
                      {share.profiles?.display_name || share.profiles?.email || "Unknown"}
                    </p>
                    {share.profiles?.display_name && (
                      <p className="text-xs text-gray-400">{share.profiles.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 capitalize">{share.role}</span>
                    <button
                      onClick={() => handleRemove(share.shared_with_user_id)}
                      disabled={isPending}
                      className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Remove access"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
