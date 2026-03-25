create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, name)
);

create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  scenario_id uuid references public.scenarios(id) on delete set null,
  project_name text not null,
  scenario_name text,
  simulation_mode text not null default 'Synthetic Only',
  input_payload jsonb not null,
  output_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.research_runs add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.research_runs add column if not exists scenario_id uuid references public.scenarios(id) on delete set null;
alter table public.research_runs add column if not exists scenario_name text;

create index if not exists research_runs_user_id_created_at_idx
  on public.research_runs (user_id, created_at desc);

create index if not exists scenarios_project_id_created_at_idx
  on public.scenarios (project_id, created_at desc);

alter table public.projects enable row level security;
alter table public.scenarios enable row level security;
alter table public.research_runs enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "scenarios_select_own" on public.scenarios;
create policy "scenarios_select_own"
  on public.scenarios
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "scenarios_insert_own" on public.scenarios;
create policy "scenarios_insert_own"
  on public.scenarios
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "scenarios_update_own" on public.scenarios;
create policy "scenarios_update_own"
  on public.scenarios
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
