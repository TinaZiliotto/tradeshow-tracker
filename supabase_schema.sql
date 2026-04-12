-- ============================================================
-- TRADESHOW TRACKER — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- USERS / ROLES  (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  role        text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;

-- Users can read their own profile; admins can read all
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Only admins can update roles
create policy "profiles_update" on public.profiles
  for update using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- DROPDOWN CONFIG  (admin-managed lists)
-- ─────────────────────────────────────────
create table public.dropdown_options (
  id          uuid primary key default uuid_generate_v4(),
  category    text not null,   -- e.g. 'carrier', 'contact', 'equipment_name', 'show_status'
  value       text not null,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  unique(category, value)
);
alter table public.dropdown_options enable row level security;
create policy "dropdown_select_all"  on public.dropdown_options for select using (true);
create policy "dropdown_admin_write" on public.dropdown_options for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Seed default dropdown values
insert into public.dropdown_options (category, value, sort_order) values
  ('show_status', 'Confirmed', 1),
  ('show_status', 'TBA', 2),
  ('show_status', 'Cancelled', 3),
  ('show_status', 'Completed', 4),
  ('carrier', 'Regal', 1),
  ('carrier', 'FTI', 2),
  ('carrier', 'FedEx', 3),
  ('carrier', 'UPS', 4),
  ('carrier', 'Hand Carry', 5),
  ('contact', 'Mason', 1),
  ('contact', 'Jake', 2),
  ('contact', 'Victor', 3),
  ('contact', 'Gonzalo', 4),
  ('contact', 'Eric', 5),
  ('equipment_name', 'Raptor 200 Standalone', 1),
  ('equipment_name', 'Raptor Combo', 2),
  ('equipment_name', 'Raptor BBK Combo', 3),
  ('equipment_name', 'Raptor Flex', 4),
  ('equipment_name', 'Raptor XL', 5),
  ('equipment_name', 'Low Cost Raptor', 6),
  ('equipment_name', 'ICON XR Combo', 7),
  ('equipment_name', 'SXS Interceptor', 8),
  ('equipment_name', 'Interceptor BRC', 9),
  ('equipment_name', 'Interceptor DF', 10),
  ('equipment_name', 'Multi Lane', 11),
  ('equipment_name', 'Sanitary Conveyor', 12),
  ('equipment_name', 'Gravity', 13),
  ('equipment_name', 'Lab Unit', 14),
  ('equipment_name', 'Vertex', 15),
  ('equipment_name', 'BRC', 16),
  ('equipment_name', 'Pipeline', 17),
  ('equipment_name', 'Combo', 18),
  ('equipment_name', 'Meat Pump', 19),
  ('equipment_name', 'Hospitality Crate', 20),
  ('equipment_name', 'Roller Ball Reject', 21),
  ('supply_category', 'Marketing Merch', 1),
  ('supply_category', 'Cleaning Supplies', 2),
  ('supply_category', 'Other', 3);

-- ─────────────────────────────────────────
-- TRADESHOWS
-- ─────────────────────────────────────────
create table public.tradeshows (
  id            uuid primary key default uuid_generate_v4(),
  show_name     text not null,
  year          int not null default extract(year from now()),
  status        text default 'Confirmed',
  booth_number  text,
  sales_order   text,
  show_contact  text,
  dates_start   date,
  dates_end     date,
  move_in       text,   -- free text to preserve complex notes like in Excel
  move_out      text,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.tradeshows enable row level security;
create policy "tradeshows_select"      on public.tradeshows for select using (true);
create policy "tradeshows_admin_write" on public.tradeshows for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────
-- EQUIPMENT  (child of tradeshow)
-- ─────────────────────────────────────────
create table public.equipment (
  id              uuid primary key default uuid_generate_v4(),
  tradeshow_id    uuid references public.tradeshows(id) on delete cascade not null,
  item_no         text,
  equipment_name  text,
  serial_numbers  text,   -- comma-separated or free text
  part_numbers    text,   -- comma-separated or free text
  crate_number    text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.equipment enable row level security;
create policy "equipment_select"      on public.equipment for select using (true);
create policy "equipment_admin_write" on public.equipment for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────
-- CRATES  (child of tradeshow)
-- ─────────────────────────────────────────
create table public.crates (
  id              uuid primary key default uuid_generate_v4(),
  tradeshow_id    uuid references public.tradeshows(id) on delete cascade not null,
  crate_number    text,
  dimensions      text,
  weight          text,
  equipment_list  text,
  spare_parts     text,
  notes           text,
  created_at      timestamptz default now()
);
alter table public.crates enable row level security;
create policy "crates_select"      on public.crates for select using (true);
create policy "crates_admin_write" on public.crates for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────
-- SHIPPING  (child of tradeshow)
-- ─────────────────────────────────────────
create table public.shipping (
  id            uuid primary key default uuid_generate_v4(),
  tradeshow_id  uuid references public.tradeshows(id) on delete cascade not null,
  direction     text check (direction in ('pre-show', 'post-show')),
  carrier       text,
  ship_date     date,
  notes         text,
  created_at    timestamptz default now()
);
alter table public.shipping enable row level security;
create policy "shipping_select"      on public.shipping for select using (true);
create policy "shipping_admin_write" on public.shipping for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────
-- SUPPLIES  (child of tradeshow)
-- ─────────────────────────────────────────
create table public.supplies (
  id            uuid primary key default uuid_generate_v4(),
  tradeshow_id  uuid references public.tradeshows(id) on delete cascade not null,
  category      text,
  item          text,
  quantity      text,
  notes         text,
  created_at    timestamptz default now()
);
alter table public.supplies enable row level security;
create policy "supplies_select"      on public.supplies for select using (true);
create policy "supplies_admin_write" on public.supplies for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────
-- FILES  (attached to any entity)
-- ─────────────────────────────────────────
create table public.files (
  id            uuid primary key default uuid_generate_v4(),
  entity_type   text not null,  -- 'tradeshow' | 'equipment' | 'crate' | 'shipping'
  entity_id     uuid not null,
  file_name     text not null,
  storage_path  text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references auth.users(id),
  uploaded_at   timestamptz default now()
);
alter table public.files enable row level security;
create policy "files_select"         on public.files for select using (true);
-- Both admins AND viewers can insert files
create policy "files_insert"         on public.files for insert with check (auth.uid() is not null);
-- Only admins can delete files
create policy "files_admin_delete"   on public.files for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────
-- AUDIT LOG
-- ─────────────────────────────────────────
create table public.audit_log (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id),
  user_email   text,
  action       text not null,  -- 'create' | 'update' | 'delete' | 'upload'
  entity_type  text not null,
  entity_id    uuid,
  entity_label text,           -- human-readable name for UI display
  old_value    jsonb,
  new_value    jsonb,
  timestamp    timestamptz default now()
);
alter table public.audit_log enable row level security;
-- Only admins can view audit log
create policy "audit_select" on public.audit_log for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
-- System inserts are done via service role (or RLS bypass on insert)
create policy "audit_insert" on public.audit_log for insert with check (true);

-- ─────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────
-- Run this separately in Supabase Dashboard > Storage > New Bucket
-- Name: tradeshow-files
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: image/*, application/pdf, application/msword,
--   application/vnd.openxmlformats-officedocument.*, application/vnd.ms-excel

-- Storage policies (add in Dashboard > Storage > tradeshow-files > Policies):
-- SELECT: authenticated users only
-- INSERT: authenticated users only
-- DELETE: admin role only

-- ─────────────────────────────────────────
-- UPDATED_AT trigger helper
-- ─────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_tradeshows_updated_at before update on public.tradeshows
  for each row execute procedure public.set_updated_at();
create trigger set_equipment_updated_at before update on public.equipment
  for each row execute procedure public.set_updated_at();
