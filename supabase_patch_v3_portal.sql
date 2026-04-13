-- ============================================================
-- PATCH v3: Add portal_entries table (Topic 11)
-- Run in Supabase SQL Editor
-- ============================================================

create table public.portal_entries (
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

-- All logged-in users can view portal entries
create policy "portal_select" on public.portal_entries
  for select using (auth.uid() is not null);

-- Only admins can insert, update, delete
create policy "portal_admin_write" on public.portal_entries
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Auto-update updated_at on changes
create trigger set_portal_updated_at
  before update on public.portal_entries
  for each row execute procedure public.set_updated_at();
