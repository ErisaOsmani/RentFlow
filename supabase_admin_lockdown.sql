-- RentFlow admin lockdown.
-- Run this in Supabase SQL Editor after your users table exists.
--
-- Replace the UUID below with the id of the one existing admin account.
-- You can find it with:
-- select id, email from public.users where role = 'admin';

create table if not exists public.admin_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.admin_allowlist (user_id)
values ('00000000-0000-0000-0000-000000000000')
on conflict (user_id) do nothing;

create or replace function public.lock_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin'
    and not exists (
      select 1
      from public.admin_allowlist allowlist
      where allowlist.user_id = new.id
    )
  then
    raise exception 'Only the allowed admin account can have the admin role.';
  end if;

  if TG_OP = 'UPDATE' and old.role = 'admin' and new.role <> 'admin' then
    raise exception 'The existing admin role is locked.';
  end if;

  return new;
end;
$$;

drop trigger if exists users_lock_admin_role on public.users;
create trigger users_lock_admin_role
before insert or update of role on public.users
for each row
execute function public.lock_admin_role();
