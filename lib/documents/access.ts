import type { DocumentShare } from "@/lib/types";

/**
 * Pure access-control logic — no Supabase dependency.
 * These functions mirror the RLS policies so they can be unit-tested.
 */

export function canReadDocument({
  userId,
  ownerId,
  shares,
}: {
  userId: string;
  ownerId: string;
  shares: Pick<DocumentShare, "shared_with_user_id">[];
}): boolean {
  if (userId === ownerId) return true;
  return shares.some((s) => s.shared_with_user_id === userId);
}

export function canEditDocument({
  userId,
  ownerId,
  shares,
}: {
  userId: string;
  ownerId: string;
  shares: Pick<DocumentShare, "shared_with_user_id" | "role">[];
}): boolean {
  if (userId === ownerId) return true;
  return shares.some(
    (s) => s.shared_with_user_id === userId && s.role === "editor"
  );
}

export function canDeleteDocument({
  userId,
  ownerId,
}: {
  userId: string;
  ownerId: string;
}): boolean {
  return userId === ownerId;
}

export function canShareDocument({
  userId,
  ownerId,
}: {
  userId: string;
  ownerId: string;
}): boolean {
  return userId === ownerId;
}
