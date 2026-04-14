-- ============================================================
-- PATCH v4c — Checklist table + uploader_email column fix
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add uploader_email column to files table
--    This fixes the "files not showing" bug by avoiding
--    an inaccessible join on auth.users
alter table public.files add column if not exists uploader_email text;

-- Backfill existing rows where possible (best effort)
update public.files f
set uploader_email = (
  select email from auth.users u where u.id = f.uploaded_by
)
where uploader_email is null and uploaded_by is not null;

-- 2. Show checklists table
create table if not exists public.show_checklists (
  id            uuid primary key default uuid_generate_v4(),
  tradeshow_id  uuid references public.tradeshows(id) on delete cascade not null unique,
  items         jsonb not null default '[]',
  submitted     boolean not null default false,
  submitted_by  text,
  submitted_at  timestamptz,
  updated_at    timestamptz default now()
);

alter table public.show_checklists enable row level security;

drop policy if exists "checklists_select"      on public.show_checklists;
drop policy if exists "checklists_write"        on public.show_checklists;

-- All logged-in users can read and write checklists
-- (non-admins can tick boxes and save progress)
create policy "checklists_select" on public.show_checklists
  for select using (auth.uid() is not null);

create policy "checklists_write" on public.show_checklists
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);
