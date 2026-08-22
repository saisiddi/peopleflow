-- Migration 03: Meetings + attendees + in-app notifications

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  agenda text,
  meeting_date date not null,
  meeting_time text not null,
  place text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  employee_id uuid references profiles(id),
  seen boolean default false,
  unique (meeting_id, employee_id)
);

alter table meetings enable row level security;
alter table meeting_attendees enable row level security;

-- visible to: admins, the creator, and attendees (attendee check deliberately
-- only touches meeting_attendees' own policy — no cross-table policy recursion)
create policy "meetings_select" on meetings for select to authenticated
  using (
    created_by = auth.uid()
    or is_admin()
    or exists (
      select 1 from meeting_attendees ma
      where ma.employee_id = auth.uid() and ma.meeting_id = meetings.id
    )
  );

create policy "attendees_select" on meeting_attendees for select to authenticated
  using (employee_id = auth.uid() or is_admin());

alter publication supabase_realtime add table meetings;
alter publication supabase_realtime add table meeting_attendees;
