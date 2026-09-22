-- Phase 1 schema. Characters are global catalogue data; ownership is kept separately.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('main', 'sub')),
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slot)
);

create table if not exists public.characters (
  id text primary key,
  name text not null,
  form text,
  attribute text,
  attack_type text,
  battle_type text,
  rarity smallint,
  abilities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_characters (
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id text not null references public.characters(id),
  quantity integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, character_id)
);

create table if not exists public.box_imports (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_filename text not null,
  recognition_status text not null check (recognition_status in ('pending', 'reviewed', 'saved', 'failed')),
  recognition_result jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.account_characters enable row level security;
alter table public.box_imports enable row level security;
create policy "owners manage their accounts" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owners manage owned characters" on public.account_characters for all using (exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())) with check (exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy "owners manage their imports" on public.box_imports for all using (exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())) with check (exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()));
