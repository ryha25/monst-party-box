-- User-provided artwork, readable only by its existing BOX account owner.
grant usage on schema icon_assets to authenticated;
grant select (character_id, image_data) on icon_assets.reference_images to authenticated;
alter table icon_assets.reference_images enable row level security;
create policy "picture book owner artwork read" on icon_assets.reference_images
for select to authenticated using ((select auth.uid()) = '6f0408c6-1759-4180-a270-c6ed13f62d96'::uuid);

create or replace function public.get_reference_icons(character_ids text[])
returns table(character_id text, image_base64 text)
language sql stable security invoker set search_path = ''
as $$
  select r.character_id, replace(pg_catalog.encode(r.image_data, 'base64'), E'\n', '')
  from icon_assets.reference_images r
  where r.character_id = any(character_ids[1:100])
  and (select auth.uid()) is not null;
$$;
revoke all on function public.get_reference_icons(text[]) from public, anon;
grant execute on function public.get_reference_icons(text[]) to authenticated;
