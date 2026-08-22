-- Migration 02: seed a payroll row for every user (Google OAuth users were missing one)

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

  insert into public.payroll (employee_id, base_salary, allowances, deductions, net_salary, month, year)
  values (new.id, 50000, 5000, 2000, 53000, trim(to_char(now(), 'Month')), extract(year from now())::int)
  on conflict do nothing;
  return new;
end; $$;

-- backfill: anyone without a payroll row gets the standard seed
insert into public.payroll (employee_id, base_salary, allowances, deductions, net_salary, month, year)
select p.id, 50000, 5000, 2000, 53000, trim(to_char(now(), 'Month')), extract(year from now())::int
from public.profiles p
where not exists (select 1 from public.payroll pr where pr.employee_id = p.id);
