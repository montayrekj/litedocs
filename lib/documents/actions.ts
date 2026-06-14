"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { TipTapDoc } from "@/lib/types";

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, user };
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createDocument(title = "Untitled Document") {
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "page");
  return data;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getDocument(id: string) {
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const isOwner = data.owner_id === user.id;
  return { ...data, isOwner };
}

export async function getMyDocuments() {
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({ ...d, isOwner: true as const }));
}

export async function getSharedWithMe() {
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("document_shares")
    .select("document_id, role, documents(*)")
    .eq("shared_with_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => row.documents && !Array.isArray(row.documents))
    .map((row) => {
      const doc = row.documents as unknown as Record<string, unknown>;
      return {
        id: doc.id as string,
        owner_id: doc.owner_id as string,
        title: doc.title as string,
        content: (doc.content ?? null) as TipTapDoc | null,
        created_at: doc.created_at as string,
        updated_at: doc.updated_at as string,
        isOwner: false as const,
        shareRole: row.role,
      };
    });
}

// ─── Update ───────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export async function updateDocument(
  id: string,
  updates: { title?: string; content?: TipTapDoc }
) {
  const parsed = updateSchema.parse({ id, ...updates });
  const { supabase } = await getAuthUser();

  const { error } = await supabase
    .from("documents")
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/documents/${id}`, "page");
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteDocument(id: string) {
  const { supabase, user } = await getAuthUser();

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "page");
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

const shareSchema = z.object({
  documentId: z.string().uuid(),
  email: z.string().email(),
});

export async function shareDocument(documentId: string, email: string) {
  const parsed = shareSchema.parse({ documentId, email });
  const { supabase, user } = await getAuthUser();

  // Verify caller is the owner
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("owner_id")
    .eq("id", parsed.documentId)
    .single();

  if (docError || !doc) throw new Error("Document not found");
  if (doc.owner_id !== user.id) throw new Error("Only the owner can share");

  // Look up target user by email via profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.email)
    .single();

  if (profileError || !profile) throw new Error("User not found");
  if (profile.id === user.id) throw new Error("Cannot share with yourself");

  const { error } = await supabase.from("document_shares").upsert(
    {
      document_id: parsed.documentId,
      shared_with_user_id: profile.id,
      role: "editor",
    },
    { onConflict: "document_id,shared_with_user_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/documents/${parsed.documentId}`, "page");
}

export async function getDocumentShares(documentId: string) {
  const { supabase } = await getAuthUser();

  // Fetch shares first, then manually join profiles to avoid missing FK in schema cache
  const { data: shares, error } = await supabase
    .from("document_shares")
    .select("id, document_id, shared_with_user_id, role, created_at")
    .eq("document_id", documentId);

  if (error) throw new Error(error.message);
  if (!shares || shares.length === 0) return [];

  const userIds = shares.map((s) => s.shared_with_user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return shares.map((share) => ({
    ...share,
    profiles: profileMap.get(share.shared_with_user_id) ?? null,
  }));
}

export async function removeShare(documentId: string, userId: string) {
  const { supabase, user } = await getAuthUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("owner_id")
    .eq("id", documentId)
    .single();

  if (!doc || doc.owner_id !== user.id) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("document_shares")
    .delete()
    .eq("document_id", documentId)
    .eq("shared_with_user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath(`/documents/${documentId}`, "page");
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signOut() {
  const { supabase } = await getAuthUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function importDocument(title: string, content: TipTapDoc) {
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title, content })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "page");
  return data;
}
