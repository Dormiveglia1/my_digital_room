-- My Digital Room: single-owner security hardening
--
-- Before running this file, find your UUID in Supabase SQL Editor:
--   select id, email from auth.users order by created_at;
-- Replace YOUR_ADMIN_USER_UUID below with the UUID belonging to Eric's admin account.
--
-- This migration is safe to run more than once after the placeholder is replaced.

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.portfolio_admins enable row level security;
revoke all on table public.portfolio_admins from anon, authenticated;

insert into public.portfolio_admins (user_id)
values ('YOUR_ADMIN_USER_UUID')
on conflict (user_id) do nothing;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.portfolio_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

-- Replace broad authenticated-owner policies with one explicit administrator gate.
drop policy if exists "owner manages settings" on public.site_settings;
drop policy if exists "owner manages projects" on public.projects;
drop policy if exists "owner manages photos" on public.photos;
drop policy if exists "owner manages music" on public.music_tracks;
drop policy if exists "owner manages game entries" on public.game_entries;
drop policy if exists "owner manages game media" on public.game_entry_media;
drop policy if exists "owner manages collection" on public.collection_items;
drop policy if exists "owner manages messages" on public.terminal_messages;
drop policy if exists "owner manages game diary entries" on public.game_diary_entries;
drop policy if exists "owner reads visits" on public.page_visits;

create policy "admin manages settings" on public.site_settings for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin manages projects" on public.projects for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin manages photos" on public.photos for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin manages music" on public.music_tracks for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin manages game entries" on public.game_entries for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin manages game media" on public.game_entry_media for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin manages collection" on public.collection_items for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin manages messages" on public.terminal_messages for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin manages game diary entries" on public.game_diary_entries for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admin reads visits" on public.page_visits for select to authenticated using (public.is_portfolio_admin());

-- A diary item and its attached images are public only when its parent game is public.
drop policy if exists "public reads game diary entries" on public.game_diary_entries;
drop policy if exists "public reads game media" on public.game_entry_media;

create policy "public reads game diary entries"
on public.game_diary_entries for select
using (
  exists (
    select 1 from public.game_entries
    where game_entries.id = game_diary_entries.game_entry_id
      and game_entries.is_public = true
  )
);

create policy "public reads game media"
on public.game_entry_media for select
using (
  exists (
    select 1 from public.game_entries
    where game_entries.id = game_entry_media.game_entry_id
      and game_entries.is_public = true
  )
);

-- Storage: existing policies are replaced with the same single-admin gate.
drop policy if exists "authenticated uploads portfolio assets" on storage.objects;
drop policy if exists "owner updates portfolio assets" on storage.objects;
drop policy if exists "owner deletes portfolio assets" on storage.objects;

create policy "admin uploads portfolio assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-assets' and public.is_portfolio_admin());

create policy "admin updates portfolio assets"
on storage.objects for update to authenticated
using (bucket_id = 'portfolio-assets' and public.is_portfolio_admin())
with check (bucket_id = 'portfolio-assets' and public.is_portfolio_admin());

create policy "admin deletes portfolio assets"
on storage.objects for delete to authenticated
using (bucket_id = 'portfolio-assets' and public.is_portfolio_admin());