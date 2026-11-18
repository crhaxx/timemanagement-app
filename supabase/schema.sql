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
  context text not null check (context in ('osobni', 'dibsido', 'weply', 'nccore', 'skola')),
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
