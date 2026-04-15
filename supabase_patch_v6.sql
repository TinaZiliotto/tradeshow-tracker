-- ============================================================
-- PATCH v6 — System service log
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Service entries table
create table if not exists public.system_service_entries (
  id               uuid primary key default uuid_generate_v4(),
  system_id        uuid references public.systems(id) on delete cascade not null,
  show_id          uuid references public.tradeshows(id) on delete set null,
  description      text not null,
  severity         text not null default 'cosmetic',
  status           text not null default 'open' check (status in ('open', 'resolved')),
  reported_by      text,
  reported_at      timestamptz default now(),
  resolved_by      text,
  resolved_at      timestamptz,
  resolution_note  text
);

alter table public.system_service_entries enable row level security;

-- All logged-in users can read service entries
drop policy if exists "service_select" on public.system_service_entries;
create policy "service_select" on public.system_service_entries
  for select using (auth.uid() is not null);

-- All logged-in users can INSERT (any user can report an issue after scanning QR)
drop policy if exists "service_insert" on public.system_service_entries;
create policy "service_insert" on public.system_service_entries
  for insert with check (auth.uid() is not null);

-- Editors and admins can UPDATE (mark as resolved)
drop policy if exists "service_update" on public.system_service_entries;
create policy "service_update" on public.system_service_entries
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  );

-- Only admins can DELETE entries
drop policy if exists "service_delete" on public.system_service_entries;
create policy "service_delete" on public.system_service_entries
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 2. Seed default severity levels
insert into public.dropdown_options (category, value, sort_order) values
  ('service_severity', 'cosmetic',   1),
  ('service_severity', 'functional', 2),
  ('service_severity', 'critical',   3)
on conflict (category, value) do nothing;
