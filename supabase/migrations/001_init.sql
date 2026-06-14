-- ============================================================
-- 001_init.sql  — Ajaia Docs schema + RLS policies
-- Run this in the Supabase SQL Editor (Project → SQL Editor)
--
-- Creation order (required to avoid circular RLS references):
--   1. Extensions
--   2. profiles table + RLS + trigger
--   3. documents table + RLS enabled (NO policies yet)
--   4. document_shares table + RLS + all its policies
--   5. Security-definer helper functions (break RLS circular refs)
--   6. documents RLS policies (now safe to reference document_shares via functions)
--   7. updated_at trigger
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  display_name text,
  created_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles: authenticated read"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: own update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Documents (table + RLS enabled, policies added later) ───
create table if not exists public.documents (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Untitled Document',
  content    jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.documents enable row level security;

-- Insert and delete policies don't reference document_shares so safe to add now
create policy "documents: owner insert"
  on public.documents for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "documents: owner delete"
  on public.documents for delete
  to authenticated
  using (owner_id = auth.uid());

-- ─── Document Shares ─────────────────────────────────────────
create table if not exists public.document_shares (
  id                    uuid primary key default uuid_generate_v4(),
  document_id           uuid not null references public.documents(id) on delete cascade,
  shared_with_user_id   uuid not null references auth.users(id) on delete cascade,
  role                  text not null default 'editor' check (role in ('editor')),
  created_at            timestamptz default now(),
  unique(document_id, shared_with_user_id)
);

alter table public.document_shares enable row level security;

-- ─── Security-definer helpers (bypass RLS to break circular refs) ─
-- These run as the function owner so they don't re-trigger RLS policies.

create or replace function public.is_document_owner(doc_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.documents
    where id = doc_id and owner_id = auth.uid()
  );
$$;

create or replace function public.has_share_access(doc_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.document_shares
    where document_id = doc_id
      and shared_with_user_id = auth.uid()
  );
$$;

create or replace function public.has_editor_access(doc_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.document_shares
    where document_id = doc_id
      and shared_with_user_id = auth.uid()
      and role = 'editor'
  );
$$;

-- ─── Document Shares RLS policies ────────────────────────────
-- (uses is_document_owner() to avoid referencing documents via RLS)

create policy "shares: owner or recipient can read"
  on public.document_shares for select
  to authenticated
  using (
    shared_with_user_id = auth.uid()
    or public.is_document_owner(document_id)
  );

create policy "shares: owner can insert"
  on public.document_shares for insert
  to authenticated
  with check (public.is_document_owner(document_id));

create policy "shares: owner can delete"
  on public.document_shares for delete
  to authenticated
  using (public.is_document_owner(document_id));

-- ─── Documents RLS policies ───────────────────────────────────
-- (uses helper functions so document_shares is not accessed via RLS → no recursion)

create policy "documents: owner or shared can read"
  on public.documents for select
  to authenticated
  using (owner_id = auth.uid() or public.has_share_access(id));

create policy "documents: owner or shared editor can update"
  on public.documents for update
  to authenticated
  using (owner_id = auth.uid() or public.has_editor_access(id));

-- ─── Updated-at trigger ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at
  before update on public.documents
  for each row execute procedure public.set_updated_at();
