-- ============================================================
-- PATCH v5 — Editor role, new show/system fields, notes table
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Update profiles role check to allow 'editor'
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'editor', 'viewer'));

-- 2. New columns on tradeshows
alter table public.tradeshows add column if not exists booth_size     text;
alter table public.tradeshows add column if not exists location_city  text;
alter table public.tradeshows add column if not exists fti_booth_type text;

-- 3. New columns on systems
alter table public.systems add column if not exists equipment_weight text;
alter table public.systems add column if not exists crate_weight     text;

-- 4. Show notes table (free-form notes per show, separate from the show's own notes field)
create table if not exists public.show_notes (
  id            uuid primary key default uuid_generate_v4(),
  tradeshow_id  uuid references public.tradeshows(id) on delete cascade not null unique,
  notes         text not null default '',
  updated_at    timestamptz default now()
);

alter table public.show_notes enable row level security;

drop policy if exists "show_notes_select" on public.show_notes;
drop policy if exists "show_notes_write"  on public.show_notes;

create policy "show_notes_select" on public.show_notes
  for select using (auth.uid() is not null);

-- Editors and admins can write; viewers are read-only
create policy "show_notes_write" on public.show_notes
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'editor')
    )
  );

-- 5. Allow editors to write to tradeshows, systems, show_systems,
--    show_supplies, show_brochures, show_checklists, portal_entries, shipping, supplies

-- tradeshows
drop policy if exists "tradeshows_admin_write" on public.tradeshows;
create policy "tradeshows_editor_write" on public.tradeshows
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
  );

-- systems
drop policy if exists "systems_admin_write" on public.systems;
create policy "systems_editor_write" on public.systems
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
  );

-- show_systems
drop policy if exists "show_systems_admin_write" on public.show_systems;
create policy "show_systems_editor_write" on public.show_systems
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
  );

-- show_supplies
drop policy if exists "show_supplies_admin_write" on public.show_supplies;
create policy "show_supplies_editor_write" on public.show_supplies
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
  );

-- show_brochures
drop policy if exists "show_brochures_admin_write" on public.show_brochures;
create policy "show_brochures_editor_write" on public.show_brochures
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
  );

-- show_checklists
drop policy if exists "checklists_write" on public.show_checklists;
create policy "checklists_write" on public.show_checklists
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- portal_entries
drop policy if exists "portal_admin_write" on public.portal_entries;
create policy "portal_editor_write" on public.portal_entries
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
  );

-- shipping
drop policy if exists "shipping_admin_write" on public.shipping;
create policy "shipping_editor_write" on public.shipping
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
  );

-- supplies
drop policy if exists "supplies_admin_write" on public.supplies;
create policy "supplies_editor_write" on public.supplies
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
  );

-- dropdown_options stays admin-only (editors cannot change settings)
-- files: viewers and editors can upload, only admins delete (already set correctly)
