-- Run this once in Supabase SQL Editor.
-- game_entries becomes the game-folder table; each folder can contain many diary entries.

create table if not exists public.game_diary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_entry_id uuid not null references public.game_entries(id) on delete cascade,
  body text not null default '',
  published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_diary_entries enable row level security;

drop policy if exists "public reads game diary entries" on public.game_diary_entries;
drop policy if exists "owner manages game diary entries" on public.game_diary_entries;

create policy "public reads game diary entries"
on public.game_diary_entries for select using (true);

create policy "owner manages game diary entries"
on public.game_diary_entries for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- New media attachments belong to a diary entry. This column is nullable so
-- your existing attachments stay valid while future attachments use the new link.
alter table public.game_entry_media add column if not exists diary_entry_id uuid references public.game_diary_entries(id) on delete cascade;

-- Carry any existing one-entry game notes into the new diary structure.
insert into public.game_diary_entries (owner_id, game_entry_id, body, published_at)
select game.owner_id, game.id, game.diary, game.published_at::date
from public.game_entries game
where coalesce(trim(game.diary), '') <> ''
  and not exists (
    select 1 from public.game_diary_entries diary where diary.game_entry_id = game.id
  );

-- Move existing attachments to the first migrated diary entry for each game.
update public.game_entry_media media
set diary_entry_id = diary.id
from (
  select distinct on (game_entry_id) id, game_entry_id
  from public.game_diary_entries
  order by game_entry_id, created_at asc
) diary
where media.game_entry_id = diary.game_entry_id and media.diary_entry_id is null;
