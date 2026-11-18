-- Personal brain-dump backlog.
-- Run this in the Supabase SQL editor (or as a migration) before opening the app.
--
-- RLS is enabled. The policies below allow the anon key shipped in the Expo app
-- to read and write every row. That matches a private capture tool, and it also
-- means anyone who extracts the anon key can access the table. Add auth and
-- tighten these policies before the data is anything you would not publish.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) > 0),
  notes text,
  -- Slug from public.focus_areas. Older rows may keep a slug that is no longer listed.
  context text not null,
  effort_minutes integer not null check (effort_minutes > 0),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'backlog' check (status in ('backlog', 'done')),
  deadline timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tasks_backlog_created_at_idx
  on public.tasks (created_at desc)
  where status = 'backlog';

alter table public.tasks enable row level security;

grant select, insert, update, delete on public.tasks to anon, authenticated;

drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_select"
  on public.tasks
  for select
  to anon, authenticated
  using (true);

create policy "tasks_insert"
  on public.tasks
  for insert
  to anon, authenticated
  with check (status = 'backlog');

create policy "tasks_update"
  on public.tasks
  for update
  to anon, authenticated
  using (true)
  with check (status in ('backlog', 'done'));

create policy "tasks_delete"
  on public.tasks
  for delete
  to anon, authenticated
  using (true);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null unique,
  summary text not null check (char_length(btrim(summary)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_entry_date_idx
  on public.journal_entries (entry_date desc);

alter table public.journal_entries enable row level security;

grant select, insert, update, delete on public.journal_entries to anon, authenticated;

drop policy if exists "journal_select" on public.journal_entries;
drop policy if exists "journal_insert" on public.journal_entries;
drop policy if exists "journal_update" on public.journal_entries;
drop policy if exists "journal_delete" on public.journal_entries;

create policy "journal_select"
  on public.journal_entries
  for select
  to anon, authenticated
  using (true);

create policy "journal_insert"
  on public.journal_entries
  for insert
  to anon, authenticated
  with check (true);

create policy "journal_update"
  on public.journal_entries
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "journal_delete"
  on public.journal_entries
  for delete
  to anon, authenticated
  using (true);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.goals(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  target_value text,
  current_value text,
  unit text,
  deadline date,
  status text not null default 'active' check (status in ('active', 'done', 'dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_status_deadline_idx
  on public.goals (status, deadline);

alter table public.goals enable row level security;

grant select, insert, update, delete on public.goals to anon, authenticated;

drop policy if exists "goals_select" on public.goals;
drop policy if exists "goals_insert" on public.goals;
drop policy if exists "goals_update" on public.goals;
drop policy if exists "goals_delete" on public.goals;

create policy "goals_select"
  on public.goals
  for select
  to anon, authenticated
  using (true);

create policy "goals_insert"
  on public.goals
  for insert
  to anon, authenticated
  with check (true);

create policy "goals_update"
  on public.goals
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "goals_delete"
  on public.goals
  for delete
  to anon, authenticated
  using (true);

alter table public.tasks
  add column if not exists goal_id uuid references public.goals(id) on delete set null;
