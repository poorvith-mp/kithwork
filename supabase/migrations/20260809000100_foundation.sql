create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.owner_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email = lower(btrim(email))),
  display_name text not null default 'Workspace Owner',
  timezone text not null default 'UTC',
  locale text not null default 'en-US',
  working_day_start time not null default '09:00',
  working_day_end time not null default '18:00',
  lunch_start time not null default '13:00',
  lunch_end time not null default '14:00',
  daily_conversation_limit smallint not null default 5 check (daily_conversation_limit between 1 and 12),
  conversation_minutes smallint not null default 30 check (conversation_minutes between 15 and 120),
  resend_daily_limit smallint not null default 300 check (resend_daily_limit between 1 and 10000),
  transactional_reserve smallint not null default 100 check (transactional_reserve >= 0),
  notification_preferences jsonb not null default '{"email":true,"inApp":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index audit_events_owner_created_idx on public.audit_events (owner_id, created_at desc);
create index audit_events_entity_idx on public.audit_events (owner_id, entity_type, entity_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_unread_idx on public.notifications (owner_id, created_at desc) where read_at is null;

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  name text not null,
  definition jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, module, name)
);

create index saved_views_owner_module_idx on public.saved_views (owner_id, module);

create trigger owner_settings_updated_at before update on public.owner_settings
for each row execute function private.set_updated_at();
create trigger saved_views_updated_at before update on public.saved_views
for each row execute function private.set_updated_at();

create or replace function private.handle_owner_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    raise exception 'An email address is required.' using errcode = '23514';
  end if;

  if exists (select 1 from public.owner_settings) then
    raise exception 'This workspace already has an owner. Invite collaborators after setup.' using errcode = '42501';
  end if;

  insert into public.owner_settings (owner_id, email)
  values (new.id, lower(btrim(new.email)))
  on conflict (owner_id) do update set email = excluded.email;

  return new;
end;
$$;

revoke execute on function private.handle_owner_user() from public, anon, authenticated;

create trigger on_auth_owner_created
after insert or update of email on auth.users
for each row execute function private.handle_owner_user();

alter table public.owner_settings enable row level security;
alter table public.audit_events enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_views enable row level security;

create policy owner_settings_owner on public.owner_settings
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
create policy owner_settings_mfa on public.owner_settings as restrictive
for all to authenticated
using ((select auth.jwt()->>'aal') = 'aal2')
with check ((select auth.jwt()->>'aal') = 'aal2');

create policy audit_events_owner_read on public.audit_events
for select to authenticated
using ((select auth.uid()) = owner_id);
create policy audit_events_mfa_read on public.audit_events as restrictive
for select to authenticated
using ((select auth.jwt()->>'aal') = 'aal2');

create policy notifications_owner on public.notifications
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
create policy notifications_mfa on public.notifications as restrictive
for all to authenticated
using ((select auth.jwt()->>'aal') = 'aal2')
with check ((select auth.jwt()->>'aal') = 'aal2');

create policy saved_views_owner on public.saved_views
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
create policy saved_views_mfa on public.saved_views as restrictive
for all to authenticated
using ((select auth.jwt()->>'aal') = 'aal2')
with check ((select auth.jwt()->>'aal') = 'aal2');

revoke all on public.owner_settings, public.audit_events, public.notifications, public.saved_views from anon;
grant select, update on public.owner_settings to authenticated;
grant select on public.audit_events to authenticated;
grant select, insert, update, delete on public.notifications, public.saved_views to authenticated;
grant usage, select on sequence public.audit_events_id_seq to service_role;
