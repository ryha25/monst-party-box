-- Canonical icon data stays separate from the character record.  The image
-- bytes live in the private `character-icons` Storage bucket; this table keeps
-- only the lookup information needed by the recognition function.
create table if not exists public.character_icons (
  character_id text primary key references public.characters(id) on delete cascade,
  storage_path text not null unique,
  perceptual_hash text,
  average_red smallint check (average_red between 0 and 255),
  average_green smallint check (average_green between 0 and 255),
  average_blue smallint check (average_blue between 0 and 255),
  source_note text,
  updated_at timestamptz not null default now()
);

create index if not exists character_icons_hash_idx on public.character_icons (perceptual_hash) where perceptual_hash is not null;

alter table public.character_icons enable row level security;
create policy "catalogue icons are readable" on public.character_icons for select using (true);

-- The bucket is private: only the server-side Edge Function should read the
-- original reference icons.  The browser receives candidates, never a key.
insert into storage.buckets (id, name, public)
values ('character-icons', 'character-icons', false)
on conflict (id) do nothing;
