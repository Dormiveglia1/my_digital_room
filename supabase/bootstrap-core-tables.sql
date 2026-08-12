-- Run this in Supabase SQL Editor after fix-storage-policies.sql.
-- It creates the portfolio content tables and their RLS policies only.

create extension if not exists "pgcrypto";

create table if not exists public.site_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('FULL-STACK', 'AI EXPERIMENTS', 'GAME DEV', 'COURSEWORK')),
  title text not null, summary text not null default '', stack text[] not null default '{}',
  cover_path text, live_url text, source_url text, published_at timestamptz, sort_order integer not null default 0,
  is_public boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null, alt_text text not null default '', sort_order integer not null default 0,
  is_public boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, storage_path text not null, sort_order integer not null default 0,
  is_public boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.game_entries (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, diary text not null default '', published_at timestamptz, cover_path text,
  is_public boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.game_entry_media (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  game_entry_id uuid not null references public.game_entries(id) on delete cascade,
  storage_path text not null, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 8), title text not null, description text not null default '',
  storage_path text, item_date date, external_url text, is_public boolean not null default true,
  created_at timestamptz not null default now(), unique (owner_id, slot)
);
create table if not exists public.terminal_messages (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null, sort_order integer not null default 0, is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.page_visits (
  id bigint generated always as identity primary key, visited_at timestamptz not null default now(), scene text, referrer text
);

alter table public.site_settings enable row level security;
alter table public.projects enable row level security;
alter table public.photos enable row level security;
alter table public.music_tracks enable row level security;
alter table public.game_entries enable row level security;
alter table public.game_entry_media enable row level security;
alter table public.collection_items enable row level security;
alter table public.terminal_messages enable row level security;
alter table public.page_visits enable row level security;

drop policy if exists "public reads site settings" on public.site_settings;
drop policy if exists "public reads projects" on public.projects;
drop policy if exists "public reads photos" on public.photos;
drop policy if exists "public reads music" on public.music_tracks;
drop policy if exists "public reads game entries" on public.game_entries;
drop policy if exists "public reads game media" on public.game_entry_media;
drop policy if exists "public reads collection" on public.collection_items;
drop policy if exists "public reads terminal messages" on public.terminal_messages;
drop policy if exists "owner manages settings" on public.site_settings;
drop policy if exists "owner manages projects" on public.projects;
drop policy if exists "owner manages photos" on public.photos;
drop policy if exists "owner manages music" on public.music_tracks;
drop policy if exists "owner manages game entries" on public.game_entries;
drop policy if exists "owner manages game media" on public.game_entry_media;
drop policy if exists "owner manages collection" on public.collection_items;
drop policy if exists "owner manages messages" on public.terminal_messages;
drop policy if exists "owner reads visits" on public.page_visits;
drop policy if exists "visitors record visits" on public.page_visits;

create policy "public reads site settings" on public.site_settings for select using (true);
create policy "public reads projects" on public.projects for select using (is_public);
create policy "public reads photos" on public.photos for select using (is_public);
create policy "public reads music" on public.music_tracks for select using (is_public);
create policy "public reads game entries" on public.game_entries for select using (is_public);
create policy "public reads game media" on public.game_entry_media for select using (true);
create policy "public reads collection" on public.collection_items for select using (is_public);
create policy "public reads terminal messages" on public.terminal_messages for select using (is_public);
create policy "owner manages settings" on public.site_settings for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages projects" on public.projects for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages photos" on public.photos for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages music" on public.music_tracks for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages game entries" on public.game_entries for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages game media" on public.game_entry_media for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages collection" on public.collection_items for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages messages" on public.terminal_messages for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner reads visits" on public.page_visits for select to authenticated using (true);
create policy "visitors record visits" on public.page_visits for insert to anon, authenticated with check (true);
