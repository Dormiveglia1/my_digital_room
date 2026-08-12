-- Run this if uploads say "Bucket not found" or the initial schema.sql
-- stopped with error 42883. It ensures the bucket exists and repairs Storage policies.

insert into storage.buckets (id, name, public)
values ('portfolio-assets', 'portfolio-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "public reads portfolio assets" on storage.objects;
drop policy if exists "authenticated uploads portfolio assets" on storage.objects;
drop policy if exists "owner updates portfolio assets" on storage.objects;
drop policy if exists "owner deletes portfolio assets" on storage.objects;

create policy "public reads portfolio assets"
on storage.objects for select
using (bucket_id = 'portfolio-assets');

create policy "authenticated uploads portfolio assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-assets' and owner_id = (select auth.uid()::text));

create policy "owner updates portfolio assets"
on storage.objects for update to authenticated
using (bucket_id = 'portfolio-assets' and owner_id = (select auth.uid()::text));

create policy "owner deletes portfolio assets"
on storage.objects for delete to authenticated
using (bucket_id = 'portfolio-assets' and owner_id = (select auth.uid()::text));
