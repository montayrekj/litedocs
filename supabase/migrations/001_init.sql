-- ============================================================
-- 001_init.sql  — Ajaia Docs schema + RLS policies
-- Run this in the Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────
-- Mirror of auth.users so we can look up users by email.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  display_name text,
  created_at   timestamptz default now()
);

alter table public.profiles enable row level security;

-- Anyone authenticated can read profiles (needed for share-by-email lookup)
create policy "profiles: authenticated read"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile
create policy "profiles: own update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Auto-create profile on sign-up
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

-- ─── Documents ───────────────────────────────────────────────
create table if not exists public.documents (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Untitled Document',
  content    jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.documents enable row level security;

-- Select: owner OR shared editor
create policy "documents: owner or shared can read"
  on public.documents for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.document_shares ds
      where ds.document_id = id
        and ds.shared_with_user_id = auth.uid()
    )
  );

-- Insert: authenticated users only (they become owner)
create policy "documents: owner insert"
  on public.documents for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Update: owner OR shared editor
create policy "documents: owner or shared editor can update"
  on public.documents for update
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.document_shares ds
      where ds.document_id = id
        and ds.shared_with_user_id = auth.uid()
        and ds.role = 'editor'
    )
  );

-- Delete: owner only
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

-- Read: document owner or the person it was shared with
create policy "shares: owner or recipient can read"
  on public.document_shares for select
  to authenticated
  using (
    shared_with_user_id = auth.uid()
    or exists (
      select 1 from public.documents d
      where d.id = document_id and d.owner_id = auth.uid()
    )
  );

-- Insert: only document owner can share
create policy "shares: owner can insert"
  on public.document_shares for insert
  to authenticated
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.owner_id = auth.uid()
    )
  );

-- Delete: only document owner can revoke
create policy "shares: owner can delete"
  on public.document_shares for delete
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.owner_id = auth.uid()
    )
  );

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
