-- Dayflow HRMS — Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor

create extension if not exists "pgcrypto";

-- profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  employee_id text unique,
  full_name text,
  email text,
  role text check (role in ('employee','admin')) default 'employee',
  phone text,
  address text,
  profile_picture_url text,
  job_title text,
  department text,
  date_joined date default current_date,
  created_at timestamptz default now()
);

-- auto-create a profile row whenever a user signs up
-- (pulls Google avatar/name if present, generates employee_id)
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

-- SECURITY DEFINER helper so policies don't query profiles recursively
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- attendance
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references profiles(id) on delete cascade,
  date date not null,
  entry_time timestamptz,
  entry_source text default 'fingerprint_simulated',
  exit_time timestamptz,
  exit_source text default 'gps_geofence',
  status text check (status in ('present','absent','half_day','on_leave','pending_exit')) default 'absent',
  last_seen_lat float,
  last_seen_lng float,
  last_seen_inside_geofence_at timestamptz,
  left_geofence_at timestamptz,
  created_at timestamptz default now(),
  unique(employee_id, date)
);

-- leave requests
create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references profiles(id) on delete cascade,
  leave_type text check (leave_type in ('paid','sick','unpaid')),
  start_date date,
  end_date date,
  remarks text,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  admin_comment text,
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- payroll (seeded, not calculated)
create table if not exists payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references profiles(id) on delete cascade,
  base_salary numeric default 0,
  allowances numeric default 0,
  deductions numeric default 0,
  net_salary numeric default 0,
  month text,
  year int,
  updated_by uuid references profiles(id)
);

-- office location (single row for geofence)
create table if not exists office_location (
  id int primary key default 1,
  lat float not null,
  lng float not null,
  radius_meters int default 150
);

-- seed default office location (change to your demo coordinates!)
insert into office_location (id, lat, lng, radius_meters)
values (1, 12.9716, 77.5946, 150)
on conflict (id) do nothing;

-- RLS policies (service role / backend bypasses RLS with service key)
alter table profiles enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table payroll enable row level security;
alter table office_location enable row level security;

-- allow authenticated users to read their own profile; admins read all
create policy "profiles_select" on profiles for select to authenticated
  using (id = auth.uid() or is_admin());
create policy "profiles_update_own" on profiles for update to authenticated
  using (id = auth.uid() or is_admin());

create policy "attendance_select" on attendance for select to authenticated
  using (employee_id = auth.uid() or is_admin());
create policy "attendance_insert_own" on attendance for insert to authenticated
  with check (employee_id = auth.uid());
create policy "attendance_update_own" on attendance for update to authenticated
  using (employee_id = auth.uid() or is_admin());

create policy "leave_select" on leave_requests for select to authenticated
  using (employee_id = auth.uid() or is_admin());
create policy "leave_insert_own" on leave_requests for insert to authenticated
  with check (employee_id = auth.uid());
create policy "leave_update_admin" on leave_requests for update to authenticated
  using (is_admin());

create policy "payroll_select" on payroll for select to authenticated
  using (employee_id = auth.uid() or is_admin());
create policy "payroll_update_admin" on payroll for update to authenticated
  using (is_admin());

create policy "office_select" on office_location for select to authenticated using (true);

-- realtime for leave_requests
alter publication supabase_realtime add table leave_requests;
alter publication supabase_realtime add table attendance;

-- enable realtime
-- (done via the ALTER PUBLICATION above)
