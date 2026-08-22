-- Migration 01: fix RLS recursion + enrich new-user trigger
-- Safe to run on an existing Dayflow database.

-- SECURITY DEFINER so policies don't query profiles recursively
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- recreate all policies using is_admin()
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select to authenticated
  using (id = auth.uid() or is_admin());
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update to authenticated
  using (id = auth.uid() or is_admin());

drop policy if exists "attendance_select" on attendance;
create policy "attendance_select" on attendance for select to authenticated
  using (employee_id = auth.uid() or is_admin());
drop policy if exists "attendance_update_own" on attendance;
create policy "attendance_update_own" on attendance for update to authenticated
  using (employee_id = auth.uid() or is_admin());

drop policy if exists "leave_select" on leave_requests;
create policy "leave_select" on leave_requests for select to authenticated
  using (employee_id = auth.uid() or is_admin());
drop policy if exists "leave_update_admin" on leave_requests;
create policy "leave_update_admin" on leave_requests for update to authenticated
  using (is_admin());

drop policy if exists "payroll_select" on payroll;
create policy "payroll_select" on payroll for select to authenticated
  using (employee_id = auth.uid() or is_admin());
drop policy if exists "payroll_update_admin" on payroll;
create policy "payroll_update_admin" on payroll for update to authenticated
  using (is_admin());

-- richer auto-profile: pulls Google avatar/name, generates employee_id
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role, profile_picture_url, employee_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    'employee',
    new.raw_user_meta_data->>'avatar_url',
    'EMP-' || upper(substr(new.id::text, 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end; $$;
