create extension if not exists pgcrypto;

create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  simulation_mode text not null default 'Synthetic Only',
  input_payload jsonb not null,
  output_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists research_runs_user_id_created_at_idx
  on public.research_runs (user_id, created_at desc);

alter table public.research_runs enable row level security;

drop policy if exists "research_runs_select_own" on public.research_runs;
create policy "research_runs_select_own"
  on public.research_runs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "research_runs_insert_own" on public.research_runs;
create policy "research_runs_insert_own"
  on public.research_runs
  for insert
  to authenticated
  with check (auth.uid() = user_id);
