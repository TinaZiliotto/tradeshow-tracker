-- ============================================================
-- PATCH v4d — Fix profiles RLS + full_name from signup
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Fix profiles RLS — allow admins to update ANY row
--    The previous policy only let users update their own row.
--    This caused "Make Admin" and suspend buttons to silently fail.
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_update" on public.profiles
  for update using (
    -- Users can update their own profile
    auth.uid() = id
    OR
    -- Admins can update any profile
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins also need DELETE permission for the delete user feature
drop policy if exists "profiles_delete" on public.profiles;

create policy "profiles_delete" on public.profiles
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins need INSERT permission to create the profile row
-- (the trigger does this, but if it fails the admin can retry)
drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_insert" on public.profiles
  for insert with check (true);

-- 2. Update the signup trigger to capture full_name from user metadata
--    When signUp is called with options.data.full_name, it lands in
--    raw_user_meta_data. The trigger already reads it — just ensure
--    the trigger function is correct.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'viewer'
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;
