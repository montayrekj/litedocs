export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export interface TipTapDoc {
  type: "doc";
  content: TipTapNode[];
}

export interface Document {
  id: string;
  owner_id: string;
  title: string;
  content: TipTapDoc | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  shared_with_user_id: string;
  role: "editor";
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
}

export interface DocumentWithOwnership extends Document {
  isOwner: boolean;
  sharedBy?: string;
}
