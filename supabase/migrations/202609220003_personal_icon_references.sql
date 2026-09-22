-- Personal reference icons are learned only from a user's confirmed BOX
-- entries. They are not shared with other users or treated as official data.
create table if not exists public.personal_icon_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  character_name text not null,
  storage_path text not null unique,
  perceptual_hash text not null check (perceptual_hash ~ '^[0-9a-f]{16}$'),
  created_at timestamptz not null default now(),
  unique (user_id, character_id, perceptual_hash)
);

create index if not exists personal_icon_references_owner_hash_idx on public.personal_icon_references (user_id, perceptual_hash);
alter table public.personal_icon_references enable row level security;

insert into storage.buckets (id, name, public)
values ('personal-icon-references', 'personal-icon-references', false)
on conflict (id) do nothing;
