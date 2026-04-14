-- ============================================================
-- PATCH v4 — Full rework schema additions
-- Run in Supabase SQL Editor (in this order)
-- ============================================================

-- 1. Global systems registry (replaces per-show equipment)
create table if not exists public.systems (
  id             uuid primary key default uuid_generate_v4(),
  equipment_name text not null,
  serial_number  text not null unique,
  part_number    text,
  crate_number   text,
  location       text default 'Regal',
  dimensions     text,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.systems enable row level security;
create policy "systems_select" on public.systems for select using (auth.uid() is not null);
create policy "systems_admin_write" on public.systems for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create trigger set_systems_updated_at before update on public.systems
  for each row execute procedure public.set_updated_at();

-- 2. Join table: which systems are assigned to which shows
create table if not exists public.show_systems (
  id           uuid primary key default uuid_generate_v4(),
  tradeshow_id uuid references public.tradeshows(id) on delete cascade not null,
  system_id    uuid references public.systems(id) on delete cascade not null,
  unique(tradeshow_id, system_id)
);
alter table public.show_systems enable row level security;
create policy "show_systems_select" on public.show_systems for select using (auth.uid() is not null);
create policy "show_systems_admin_write" on public.show_systems for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- 3. Per-show supply quantities
create table if not exists public.show_supplies (
  id           uuid primary key default uuid_generate_v4(),
  tradeshow_id uuid references public.tradeshows(id) on delete cascade not null,
  category     text not null,
  item         text not null,
  quantity     text,
  unique(tradeshow_id, category, item)
);
alter table public.show_supplies enable row level security;
create policy "show_supplies_select" on public.show_supplies for select using (auth.uid() is not null);
create policy "show_supplies_admin_write" on public.show_supplies for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- 4. Per-show brochure quantities
create table if not exists public.show_brochures (
  id            uuid primary key default uuid_generate_v4(),
  tradeshow_id  uuid references public.tradeshows(id) on delete cascade not null,
  brochure_name text not null,
  quantity      text,
  unique(tradeshow_id, brochure_name)
);
alter table public.show_brochures enable row level security;
create policy "show_brochures_select" on public.show_brochures for select using (auth.uid() is not null);
create policy "show_brochures_admin_write" on public.show_brochures for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- 5. Portal entries (already added in v3 — skip if already exists)
create table if not exists public.portal_entries (
  id            uuid primary key default uuid_generate_v4(),
  tradeshow_id  uuid references public.tradeshows(id) on delete cascade not null,
  portal_name   text not null,
  portal_type   text,
  url           text,
  username      text,
  password      text,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.portal_entries enable row level security;
create policy if not exists "portal_select" on public.portal_entries for select using (auth.uid() is not null);
create policy if not exists "portal_admin_write" on public.portal_entries for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- 6. Add suspended column to profiles (for user management)
alter table public.profiles add column if not exists suspended boolean default false;

-- 7. Remove carrier column from shipping (if present)
alter table public.shipping drop column if exists carrier;

-- 8. Seed missing dropdown categories (safe — on conflict do nothing)
insert into public.dropdown_options (category, value, sort_order) values
  ('system_location', 'Regal', 1),
  ('system_location', 'Head Office (HO)', 2),
  ('system_location', 'At the Show', 3),
  ('show_status', 'In Progress', 5),
  ('show_status', 'Finished', 6),
  ('merchandise_item', 'Tote Bags', 1),
  ('merchandise_item', 'Pens', 2),
  ('merchandise_item', 'Post-it Notes', 3),
  ('merchandise_item', 'QR Code Cards', 4),
  ('merchandise_item', 'Beer Koozies', 5),
  ('merchandise_item', 'Shot Glasses', 6),
  ('merchandise_item', 'Playing Cards', 7),
  ('cleaning_item', 'Multipurpose Spray', 1),
  ('cleaning_item', 'Lysol Wipes', 2),
  ('cleaning_item', 'Kleenex', 3),
  ('cleaning_item', 'Windex', 4),
  ('cleaning_item', 'Stainless Steel Cleaner', 5),
  ('cleaning_item', 'Magic Eraser', 6),
  ('cleaning_item', 'Microfiber Cloths', 7),
  ('cleaning_item', 'Paper Towels', 8),
  ('cleaning_item', 'Trash Bin with Trash Bags', 9),
  ('cleaning_item', 'First Aid Kit', 10),
  ('cleaning_item', 'WD-40', 11),
  ('cleaning_item', 'Band-Aids', 12),
  ('office_item', 'Markers / Sharpies / Pens', 1),
  ('office_item', 'Business Card Holder', 2),
  ('office_item', 'Mesh Pen Holder', 3),
  ('office_item', 'Lanyards', 4),
  ('office_item', 'Scissors and Utility Knife', 5),
  ('office_item', 'Packing Tape', 6),
  ('office_item', 'Duct Tape', 7),
  ('office_item', 'Zip Ties (Large)', 8),
  ('office_item', 'Bungee Cord', 9),
  ('office_item', 'Stapler & Staples', 10),
  ('electrical_item', 'Extension Cords', 1),
  ('electrical_item', 'Power Strip', 2),
  ('electrical_item', 'Calibration Weight', 3),
  ('electrical_item', 'Drill', 4),
  ('misc_item', 'Bag Stand', 1),
  ('misc_item', 'Brochure Stand', 2),
  ('misc_item', 'Vacuum', 3),
  ('misc_item', 'Water', 4),
  ('brochure_item', 'Stealth', 1),
  ('brochure_item', 'Contact + Halo', 2),
  ('brochure_item', 'Gravity', 3),
  ('brochure_item', 'InFoil', 4),
  ('brochure_item', 'Lab', 5),
  ('brochure_item', 'Large Bag', 6),
  ('brochure_item', 'Lumber', 7),
  ('brochure_item', 'Meat Pump', 8),
  ('brochure_item', 'Metal Detector', 9),
  ('brochure_item', 'Mod Surface', 10),
  ('brochure_item', 'Multi AP', 11),
  ('brochure_item', 'Pharma', 12),
  ('brochure_item', 'Pipeline', 13),
  ('brochure_item', 'Vector', 14),
  ('brochure_item', 'Vent Tube', 15),
  ('brochure_item', 'Vertex', 16),
  ('brochure_item', 'Web', 17),
  ('brochure_item', 'Raptor', 18),
  ('brochure_item', 'Checkweigher', 19),
  ('brochure_item', 'Combo', 20),
  ('brochure_item', 'XL', 21),
  ('brochure_item', 'Tri Fold', 22),
  ('brochure_item', 'Interceptor', 23),
  ('brochure_item', 'Interceptor DF', 24),
  ('brochure_item', 'Interceptor MD', 25),
  ('checklist_item', 'Electrical setup complete', 1),
  ('checklist_item', 'Cleaning supplies packed', 2),
  ('checklist_item', 'Lead retrieval device collected', 3),
  ('checklist_item', 'Systems powered on and tested', 4),
  ('checklist_item', 'Booth signage installed', 5),
  ('checklist_item', 'Marketing materials stocked', 6)
on conflict (category, value) do nothing;
