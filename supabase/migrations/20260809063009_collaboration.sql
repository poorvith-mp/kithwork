create type public.collaborator_state as enum (
  'invited',
  'active',
  'suspended',
  'revoked'
);

create table public.app_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  email text not null,
  full_name text not null,
  phone text,
  role_title text,
  timezone text not null default 'UTC',
  bio text,
  photo_path text,
  notification_preferences jsonb not null default '{"email":true,"inApp":true}'::jsonb,
  account_state public.collaborator_state not null,
  is_owner boolean not null default false,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_profiles_email_normalized check (email = lower(btrim(email))),
  constraint app_profiles_owner_active check (not is_owner or account_state = 'active'),
  constraint app_profiles_revocation_consistent check (
    (account_state = 'revoked' and revoked_at is not null)
    or (account_state <> 'revoked' and revoked_at is null)
  )
);

create unique index app_profiles_email_unique
on public.app_profiles (lower(email));
create unique index app_profiles_single_owner
on public.app_profiles ((is_owner))
where is_owner;
create index app_profiles_state_idx
on public.app_profiles (account_state, created_at desc);

create table public.collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role_title text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  user_id uuid references auth.users(id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaborator_invites_email_normalized check (email = lower(btrim(email))),
  constraint collaborator_invites_acceptance_consistent check (
    (status = 'accepted' and accepted_at is not null and user_id is not null)
    or status <> 'accepted'
  )
);

create unique index collaborator_invites_pending_email_unique
on public.collaborator_invites (lower(email))
where status = 'pending';
create index collaborator_invites_status_idx
on public.collaborator_invites (status, expires_at);
create index collaborator_invites_user_idx
on public.collaborator_invites (user_id)
where user_id is not null;

create table public.module_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profiles(user_id) on delete restrict,
  module_key text not null check (
    module_key in (
      'people',
      'companies',
      'pipeline',
      'projects',
      'tasks',
      'calendar',
      'inbox',
      'files'
    )
  ),
  capabilities text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module_key),
  constraint module_permissions_capabilities_allowed check (
    cardinality(capabilities) > 0
    and capabilities <@ array['view', 'create', 'edit', 'reply', 'upload', 'move']::text[]
    and 'view' = any(capabilities)
    and case module_key
      when 'people' then capabilities <@ array['view', 'create', 'edit']::text[]
      when 'companies' then capabilities <@ array['view', 'create', 'edit']::text[]
      when 'pipeline' then capabilities <@ array['view', 'create', 'edit', 'move']::text[]
      when 'projects' then capabilities <@ array['view', 'create', 'edit', 'move']::text[]
      when 'tasks' then capabilities <@ array['view', 'create', 'edit', 'move']::text[]
      when 'calendar' then capabilities <@ array['view', 'create', 'edit', 'move']::text[]
      when 'inbox' then capabilities <@ array['view', 'reply']::text[]
      when 'files' then capabilities <@ array['view', 'upload']::text[]
      else false
    end
  )
);

create index module_permissions_user_idx
on public.module_permissions (user_id, module_key);

create table public.record_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profiles(user_id) on delete restrict,
  entity_type text not null check (
    entity_type in (
      'person',
      'company',
      'enquiry',
      'opportunity',
      'project',
      'task',
      'blocked_period',
      'slot_request',
      'appointment',
      'conversation',
      'file'
    )
  ),
  entity_id uuid not null,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index record_assignments_entity_idx
on public.record_assignments (entity_type, entity_id, user_id);
create index record_assignments_user_idx
on public.record_assignments (user_id, created_at desc);

create table public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_profiles(user_id) on delete restrict,
  session_id uuid not null unique,
  device_metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index app_sessions_user_active_idx
on public.app_sessions (user_id, last_active_at desc)
where revoked_at is null;

create trigger app_profiles_updated_at
before update on public.app_profiles
for each row execute function private.set_updated_at();
create trigger collaborator_invites_updated_at
before update on public.collaborator_invites
for each row execute function private.set_updated_at();
create trigger module_permissions_updated_at
before update on public.module_permissions
for each row execute function private.set_updated_at();

create or replace function private.is_aal2()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt()->>'aal'), '') = 'aal2';
$$;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_aal2()
    and exists (
      select 1
      from public.app_profiles profile
      where profile.user_id = (select auth.uid())
        and profile.is_owner
        and profile.account_state = 'active'
    );
$$;

create or replace function private.is_active_collaborator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_aal2()
    and exists (
      select 1
      from public.app_profiles profile
      where profile.user_id = (select auth.uid())
        and not profile.is_owner
        and profile.account_state = 'active'
    );
$$;

create or replace function private.has_module_capability(
  p_module_key text,
  p_capability text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_owner()
    or (
      private.is_active_collaborator()
      and exists (
        select 1
        from public.module_permissions permission
        where permission.user_id = (select auth.uid())
          and permission.module_key = p_module_key
          and p_capability = any(permission.capabilities)
      )
    );
$$;

create or replace function private.is_assigned(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.record_assignments assignment
    where assignment.user_id = (select auth.uid())
      and assignment.entity_type = p_entity_type
      and assignment.entity_id = p_entity_id
  );
$$;

create or replace function private.can_access_record(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_entity_id is null then
    return false;
  end if;

  if private.is_owner() then
    return true;
  end if;

  if not private.is_active_collaborator() then
    return false;
  end if;

  if private.is_assigned(p_entity_type, p_entity_id) then
    return true;
  end if;

  case p_entity_type
    when 'person' then
      return exists (
        select 1
        from public.record_assignments assignment
        where assignment.user_id = (select auth.uid())
          and (
            (assignment.entity_type = 'enquiry' and exists (
              select 1 from public.enquiries row
              where row.id = assignment.entity_id and row.person_id = p_entity_id
            ))
            or (assignment.entity_type = 'opportunity' and exists (
              select 1 from public.opportunities row
              where row.id = assignment.entity_id and row.person_id = p_entity_id
            ))
            or (assignment.entity_type = 'project' and exists (
              select 1 from public.projects row
              where row.id = assignment.entity_id and row.person_id = p_entity_id
            ))
            or (assignment.entity_type = 'slot_request' and exists (
              select 1 from public.slot_requests row
              where row.id = assignment.entity_id and row.person_id = p_entity_id
            ))
            or (assignment.entity_type = 'appointment' and exists (
              select 1 from public.appointments row
              where row.id = assignment.entity_id and row.person_id = p_entity_id
            ))
            or (assignment.entity_type = 'conversation' and exists (
              select 1 from public.conversations row
              where row.id = assignment.entity_id and row.person_id = p_entity_id
            ))
          )
      );
    when 'company' then
      return exists (
        select 1
        from public.record_assignments assignment
        where assignment.user_id = (select auth.uid())
          and (
            (assignment.entity_type = 'person' and exists (
              select 1 from public.company_people link
              where link.company_id = p_entity_id and link.person_id = assignment.entity_id
            ))
            or (assignment.entity_type = 'enquiry' and exists (
              select 1 from public.enquiries row
              where row.id = assignment.entity_id and row.company_id = p_entity_id
            ))
            or (assignment.entity_type = 'opportunity' and exists (
              select 1 from public.opportunities row
              where row.id = assignment.entity_id and row.company_id = p_entity_id
            ))
            or (assignment.entity_type = 'project' and exists (
              select 1 from public.projects row
              where row.id = assignment.entity_id and row.company_id = p_entity_id
            ))
          )
      );
    when 'enquiry' then
      return exists (
        select 1
        from public.enquiries row
        join public.record_assignments assignment
          on assignment.user_id = (select auth.uid())
        where row.id = p_entity_id
          and (
            (assignment.entity_type = 'person' and assignment.entity_id = row.person_id)
            or (assignment.entity_type = 'company' and assignment.entity_id = row.company_id)
            or (assignment.entity_type = 'opportunity' and exists (
              select 1 from public.opportunities opportunity
              where opportunity.id = assignment.entity_id
                and opportunity.enquiry_id = row.id
            ))
            or (assignment.entity_type = 'project' and exists (
              select 1 from public.projects project
              join public.opportunities opportunity on opportunity.id = project.opportunity_id
              where project.id = assignment.entity_id
                and opportunity.enquiry_id = row.id
            ))
            or (assignment.entity_type = 'slot_request' and exists (
              select 1 from public.slot_requests request
              where request.id = assignment.entity_id and request.enquiry_id = row.id
            ))
            or (assignment.entity_type = 'appointment' and exists (
              select 1 from public.appointments appointment
              where appointment.id = assignment.entity_id and appointment.enquiry_id = row.id
            ))
            or (assignment.entity_type = 'conversation' and exists (
              select 1 from public.conversations conversation
              where conversation.id = assignment.entity_id and conversation.enquiry_id = row.id
            ))
          )
      );
    when 'opportunity' then
      return exists (
        select 1
        from public.opportunities row
        join public.record_assignments assignment
          on assignment.user_id = (select auth.uid())
        where row.id = p_entity_id
          and (
            (assignment.entity_type = 'person' and assignment.entity_id = row.person_id)
            or (assignment.entity_type = 'company' and assignment.entity_id = row.company_id)
            or (assignment.entity_type = 'enquiry' and assignment.entity_id = row.enquiry_id)
            or (assignment.entity_type = 'project' and exists (
              select 1 from public.projects project
              where project.id = assignment.entity_id and project.opportunity_id = row.id
            ))
          )
      );
    when 'project' then
      return exists (
        select 1
        from public.projects row
        join public.record_assignments assignment
          on assignment.user_id = (select auth.uid())
        where row.id = p_entity_id
          and (
            (assignment.entity_type = 'person' and assignment.entity_id = row.person_id)
            or (assignment.entity_type = 'company' and assignment.entity_id = row.company_id)
            or (assignment.entity_type = 'opportunity' and assignment.entity_id = row.opportunity_id)
            or (assignment.entity_type = 'task' and exists (
              select 1 from public.tasks task
              where task.id = assignment.entity_id and task.project_id = row.id
            ))
          )
      );
    when 'task' then
      return exists (
        with recursive task_context as (
          select task.id, task.parent_task_id, task.project_id
          from public.tasks task
          where task.id = p_entity_id
          union all
          select parent.id, parent.parent_task_id, parent.project_id
          from public.tasks parent
          join task_context child on child.parent_task_id = parent.id
        )
        select 1
        from task_context context
        where private.is_assigned('task', context.id)
          or private.is_assigned('project', context.project_id)
      );
    when 'blocked_period' then
      return private.is_assigned('blocked_period', p_entity_id);
    when 'slot_request' then
      return exists (
        select 1
        from public.slot_requests row
        where row.id = p_entity_id
          and (
            private.is_assigned('person', row.person_id)
            or private.is_assigned('enquiry', row.enquiry_id)
            or exists (
              select 1 from public.appointments appointment
              where appointment.slot_request_id = row.id
                and private.is_assigned('appointment', appointment.id)
            )
          )
      );
    when 'appointment' then
      return exists (
        select 1
        from public.appointments row
        where row.id = p_entity_id
          and (
            private.is_assigned('slot_request', row.slot_request_id)
            or private.is_assigned('person', row.person_id)
            or private.is_assigned('enquiry', row.enquiry_id)
          )
      );
    when 'conversation' then
      return exists (
        select 1
        from public.conversations row
        where row.id = p_entity_id
          and (
            private.is_assigned('person', row.person_id)
            or private.is_assigned('enquiry', row.enquiry_id)
          )
      );
    when 'file' then
      return exists (
        select 1
        from public.entity_files link
        where link.file_id = p_entity_id
          and private.can_access_record(link.entity_type, link.entity_id)
      );
    else
      return false;
  end case;
end;
$$;

create or replace function private.owner_id_matches(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_profiles profile
    where profile.user_id = p_owner_id
      and profile.is_owner
      and profile.account_state = 'active'
  );
$$;

create or replace function private.can_create_root(
  p_module_key text,
  p_owner_id uuid,
  p_capability text default 'create'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_owner()
    or (
      private.has_module_capability(p_module_key, p_capability)
      and private.owner_id_matches(p_owner_id)
    );
$$;

create or replace function private.can_access_entity_reference(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_entity_type
    when 'person' then private.can_access_record('person', p_entity_id)
    when 'company' then private.can_access_record('company', p_entity_id)
    when 'enquiry' then private.can_access_record('enquiry', p_entity_id)
    when 'opportunity' then private.can_access_record('opportunity', p_entity_id)
    when 'project' then private.can_access_record('project', p_entity_id)
    when 'task' then private.can_access_record('task', p_entity_id)
    when 'conversation' then private.can_access_record('conversation', p_entity_id)
    else false
  end;
$$;

revoke execute on function private.is_aal2() from public, anon;
revoke execute on function private.is_owner() from public, anon;
revoke execute on function private.is_active_collaborator() from public, anon;
revoke execute on function private.has_module_capability(text, text) from public, anon;
revoke execute on function private.is_assigned(text, uuid) from public, anon;
revoke execute on function private.can_access_record(text, uuid) from public, anon;
revoke execute on function private.owner_id_matches(uuid) from public, anon;
revoke execute on function private.can_create_root(text, uuid, text) from public, anon;
revoke execute on function private.can_access_entity_reference(text, uuid) from public, anon;

grant execute on function private.is_aal2() to authenticated;
grant execute on function private.is_owner() to authenticated;
grant execute on function private.is_active_collaborator() to authenticated;
grant execute on function private.has_module_capability(text, text) to authenticated;
grant execute on function private.is_assigned(text, uuid) to authenticated;
grant execute on function private.can_access_record(text, uuid) to authenticated;
grant execute on function private.owner_id_matches(uuid) to authenticated;
grant execute on function private.can_create_root(text, uuid, text) to authenticated;
grant execute on function private.can_access_entity_reference(text, uuid) to authenticated;

insert into public.app_profiles (
  user_id,
  email,
  full_name,
  timezone,
  notification_preferences,
  account_state,
  is_owner
)
select
  settings.owner_id,
  lower(settings.email),
  settings.display_name,
  settings.timezone,
  settings.notification_preferences,
  'active'::public.collaborator_state,
  true
from public.owner_settings settings
on conflict (user_id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    timezone = excluded.timezone,
    notification_preferences = excluded.notification_preferences,
    account_state = 'active',
    is_owner = true,
    revoked_at = null;

create or replace function private.handle_owner_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(new.email));
  invite public.collaborator_invites;
begin
  if new.email is null then
    raise exception 'An email address is required.' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.app_profiles profile where profile.user_id = new.id
  ) then
    update public.app_profiles
    set email = normalized_email
    where user_id = new.id;
    return new;
  end if;

  if not exists (
    select 1
    from public.app_profiles profile
    where profile.is_owner
  ) then
    insert into public.owner_settings (owner_id, email)
    values (new.id, normalized_email)
    on conflict (owner_id) do update set email = excluded.email;

    insert into public.app_profiles (
      user_id,
      email,
      full_name,
      timezone,
      account_state,
      is_owner
    )
    values (
      new.id,
      normalized_email,
      coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), split_part(normalized_email, '@', 1)),
      'UTC',
      'active',
      true
    )
    on conflict (user_id) do update
    set email = excluded.email,
        account_state = 'active',
        is_owner = true,
        revoked_at = null;

    return new;
  end if;

  select * into invite
  from public.collaborator_invites row
  where row.email = normalized_email
    and row.status = 'pending'
    and row.expires_at > now()
  order by row.created_at desc
  limit 1
  for update;

  if invite.id is null then
    raise exception 'This Kithwork workspace accepts invited accounts only.' using errcode = '42501';
  end if;

  insert into public.app_profiles (
    user_id,
    email,
    full_name,
    role_title,
    account_state,
    is_owner
  )
  values (
    new.id,
    normalized_email,
    invite.full_name,
    invite.role_title,
    'invited',
    false
  );

  update public.collaborator_invites
  set status = 'accepted',
      user_id = new.id,
      accepted_at = now()
  where id = invite.id;

  return new;
end;
$$;

revoke execute on function private.handle_owner_user() from public, anon, authenticated;

alter table public.audit_events
add column actor_id uuid;

create index audit_events_actor_idx
on public.audit_events (actor_id, created_at desc)
where actor_id is not null;

create or replace function private.record_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_value jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  row_owner uuid := (row_value->>'owner_id')::uuid;
  row_id text := coalesce(row_value->>'id', row_value->>'owner_id');
begin
  insert into public.audit_events (
    owner_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    row_owner,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    row_id,
    jsonb_build_object('source', current_user, 'changedAt', now())
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.record_audit_event() from public, anon, authenticated;

alter table public.app_profiles enable row level security;
alter table public.collaborator_invites enable row level security;
alter table public.module_permissions enable row level security;
alter table public.record_assignments enable row level security;
alter table public.app_sessions enable row level security;

create policy app_profiles_self_read
on public.app_profiles
for select
to authenticated
using ((select auth.uid()) = user_id or private.is_owner());

create policy app_profiles_owner_manage
on public.app_profiles
for all
to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy app_profiles_mfa
on public.app_profiles
as restrictive
for all
to authenticated
using (private.is_aal2())
with check (private.is_aal2());

create policy collaborator_invites_owner_manage
on public.collaborator_invites
for all
to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy collaborator_invites_mfa
on public.collaborator_invites
as restrictive
for all
to authenticated
using (private.is_aal2())
with check (private.is_aal2());

create policy module_permissions_authorized_read
on public.module_permissions
for select
to authenticated
using ((select auth.uid()) = user_id or private.is_owner());

create policy module_permissions_owner_manage
on public.module_permissions
for all
to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy module_permissions_mfa
on public.module_permissions
as restrictive
for all
to authenticated
using (private.is_aal2())
with check (private.is_aal2());

create policy record_assignments_authorized_read
on public.record_assignments
for select
to authenticated
using ((select auth.uid()) = user_id or private.is_owner());

create policy record_assignments_owner_manage
on public.record_assignments
for all
to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy record_assignments_mfa
on public.record_assignments
as restrictive
for all
to authenticated
using (private.is_aal2())
with check (private.is_aal2());

create policy app_sessions_self_read
on public.app_sessions
for select
to authenticated
using ((select auth.uid()) = user_id or private.is_owner());

create policy app_sessions_self_update
on public.app_sessions
for update
to authenticated
using ((select auth.uid()) = user_id or private.is_owner())
with check ((select auth.uid()) = user_id or private.is_owner());

create policy app_sessions_mfa
on public.app_sessions
as restrictive
for all
to authenticated
using (private.is_aal2())
with check (private.is_aal2());

revoke all on public.app_profiles,
  public.collaborator_invites,
  public.module_permissions,
  public.record_assignments,
  public.app_sessions
from anon;

grant select on public.app_profiles to authenticated;
grant select, insert, update on public.collaborator_invites to authenticated;
grant select, insert, update, delete on public.module_permissions to authenticated;
grant select, insert, delete on public.record_assignments to authenticated;
grant select, insert, update on public.app_sessions to authenticated;

create or replace function public.current_access_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile public.app_profiles;
  permissions jsonb;
  workspace_owner_id uuid;
begin
  if not private.is_aal2() then
    raise exception 'Authenticator verification is required.' using errcode = '42501';
  end if;

  select * into profile
  from public.app_profiles row
  where row.user_id = (select auth.uid());

  if profile.user_id is null then
    raise exception 'This account is unavailable.' using errcode = '42501';
  end if;

  select owner_profile.user_id into workspace_owner_id
  from public.app_profiles owner_profile
  where owner_profile.is_owner
    and owner_profile.account_state = 'active'
  limit 1;

  if workspace_owner_id is null then
    raise exception 'The workspace owner is unavailable.' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_object_agg(permission.module_key, to_jsonb(permission.capabilities)),
    '{}'::jsonb
  )
  into permissions
  from public.module_permissions permission
  where permission.user_id = profile.user_id;

  return jsonb_build_object(
    'isOwner', profile.is_owner,
    'accountState', profile.account_state,
    'workspaceOwnerId', workspace_owner_id,
    'permissions', permissions,
    'profile', jsonb_build_object(
      'userId', profile.user_id,
      'email', profile.email,
      'fullName', profile.full_name,
      'phone', profile.phone,
      'roleTitle', profile.role_title,
      'timezone', profile.timezone,
      'bio', profile.bio,
      'photoPath', profile.photo_path,
      'notificationPreferences', profile.notification_preferences
    )
  );
end;
$$;

revoke execute on function public.current_access_snapshot() from public, anon;
grant execute on function public.current_access_snapshot() to authenticated;

create or replace function private.assign_created_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_type text := case tg_table_name
    when 'people' then 'person'
    when 'companies' then 'company'
    when 'enquiries' then 'enquiry'
    when 'opportunities' then 'opportunity'
    when 'projects' then 'project'
    when 'tasks' then 'task'
    when 'blocked_periods' then 'blocked_period'
    when 'conversations' then 'conversation'
    when 'files' then 'file'
    else null
  end;
begin
  if assignment_type is not null and private.is_active_collaborator() then
    insert into public.record_assignments (
      user_id,
      entity_type,
      entity_id,
      assigned_by
    )
    values (
      (select auth.uid()),
      assignment_type,
      new.id,
      (select auth.uid())
    )
    on conflict (user_id, entity_type, entity_id) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function private.assign_created_record() from public, anon, authenticated;

create trigger people_assign_creator
after insert on public.people
for each row execute function private.assign_created_record();
create trigger companies_assign_creator
after insert on public.companies
for each row execute function private.assign_created_record();
create trigger enquiries_assign_creator
after insert on public.enquiries
for each row execute function private.assign_created_record();
create trigger opportunities_assign_creator
after insert on public.opportunities
for each row execute function private.assign_created_record();
create trigger projects_assign_creator
after insert on public.projects
for each row execute function private.assign_created_record();
create trigger tasks_assign_creator
after insert on public.tasks
for each row execute function private.assign_created_record();
create trigger blocked_periods_assign_creator
after insert on public.blocked_periods
for each row execute function private.assign_created_record();
create trigger conversations_assign_creator
after insert on public.conversations
for each row execute function private.assign_created_record();
create trigger files_assign_creator
after insert on public.files
for each row execute function private.assign_created_record();

create or replace function private.prevent_collaborator_lifecycle_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  protected_field text;
begin
  if private.is_owner() then
    return new;
  end if;

  if not private.is_active_collaborator() then
    raise exception 'This account cannot change Kithwork records.' using errcode = '42501';
  end if;

  if old_row->>'owner_id' is distinct from new_row->>'owner_id' then
    raise exception 'Record ownership cannot be changed.' using errcode = '42501';
  end if;

  foreach protected_field in array array['archived_at', 'deleted_at', 'purge_after']
  loop
    if old_row ? protected_field
      and old_row->protected_field is distinct from new_row->protected_field then
      raise exception 'Only the owner can archive or trash records.' using errcode = '42501';
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function private.prevent_collaborator_lifecycle_change()
from public, anon, authenticated;

create trigger people_protect_lifecycle
before update on public.people
for each row execute function private.prevent_collaborator_lifecycle_change();
create trigger companies_protect_lifecycle
before update on public.companies
for each row execute function private.prevent_collaborator_lifecycle_change();
create trigger enquiries_protect_lifecycle
before update on public.enquiries
for each row execute function private.prevent_collaborator_lifecycle_change();
create trigger opportunities_protect_lifecycle
before update on public.opportunities
for each row execute function private.prevent_collaborator_lifecycle_change();
create trigger projects_protect_lifecycle
before update on public.projects
for each row execute function private.prevent_collaborator_lifecycle_change();
create trigger tasks_protect_lifecycle
before update on public.tasks
for each row execute function private.prevent_collaborator_lifecycle_change();
create trigger conversations_protect_lifecycle
before update on public.conversations
for each row execute function private.prevent_collaborator_lifecycle_change();
create trigger files_protect_lifecycle
before update on public.files
for each row execute function private.prevent_collaborator_lifecycle_change();

do $$
declare
  policy_record record;
begin
  for policy_record in
    select * from (
      values
        ('people', 'people', 'person', 'create', 'edit'),
        ('companies', 'companies', 'company', 'create', 'edit'),
        ('opportunities', 'pipeline', 'opportunity', 'create', 'edit'),
        ('projects', 'projects', 'project', 'create', 'edit'),
        ('blocked_periods', 'calendar', 'blocked_period', 'create', 'edit'),
        ('conversations', 'inbox', 'conversation', 'create', 'reply'),
        ('files', 'files', 'file', 'upload', 'upload')
    ) as configured(table_name, module_key, entity_type, create_capability, update_capability)
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.table_name || '_owner',
      policy_record.table_name
    );

    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_owner() or (private.has_module_capability(%L, ''view'') and private.can_access_record(%L, id)))',
      policy_record.table_name || '_authorized_select',
      policy_record.table_name,
      policy_record.module_key,
      policy_record.entity_type
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.can_create_root(%L, owner_id, %L))',
      policy_record.table_name || '_authorized_insert',
      policy_record.table_name,
      policy_record.module_key,
      policy_record.create_capability
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (private.is_owner() or (private.has_module_capability(%L, %L) and private.can_access_record(%L, id))) with check (private.owner_id_matches(owner_id) and (private.is_owner() or (private.has_module_capability(%L, %L) and private.can_access_record(%L, id))))',
      policy_record.table_name || '_authorized_update',
      policy_record.table_name,
      policy_record.module_key,
      policy_record.update_capability,
      policy_record.entity_type,
      policy_record.module_key,
      policy_record.update_capability,
      policy_record.entity_type
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.is_owner())',
      policy_record.table_name || '_owner_delete',
      policy_record.table_name
    );
  end loop;
end;
$$;

drop policy opportunities_authorized_insert on public.opportunities;
create policy opportunities_authorized_insert
on public.opportunities
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.can_create_root('pipeline', owner_id)
    and private.can_access_record('person', person_id)
    and (company_id is null or private.can_access_record('company', company_id))
    and (enquiry_id is null or private.can_access_record('enquiry', enquiry_id))
  )
);
drop policy opportunities_authorized_update on public.opportunities;
create policy opportunities_authorized_update
on public.opportunities
for update to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('pipeline', 'edit')
    and private.can_access_record('opportunity', id)
  )
)
with check (
  private.owner_id_matches(owner_id)
  and (
    private.is_owner()
    or (
      private.has_module_capability('pipeline', 'edit')
      and private.can_access_record('opportunity', id)
      and private.can_access_record('person', person_id)
      and (company_id is null or private.can_access_record('company', company_id))
      and (enquiry_id is null or private.can_access_record('enquiry', enquiry_id))
    )
  )
);

drop policy projects_authorized_insert on public.projects;
create policy projects_authorized_insert
on public.projects
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.can_create_root('projects', owner_id)
    and (person_id is null or private.can_access_record('person', person_id))
    and (company_id is null or private.can_access_record('company', company_id))
    and (opportunity_id is null or private.can_access_record('opportunity', opportunity_id))
  )
);
drop policy projects_authorized_update on public.projects;
create policy projects_authorized_update
on public.projects
for update to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('projects', 'edit')
    and private.can_access_record('project', id)
  )
)
with check (
  private.owner_id_matches(owner_id)
  and (
    private.is_owner()
    or (
      private.has_module_capability('projects', 'edit')
      and private.can_access_record('project', id)
      and (person_id is null or private.can_access_record('person', person_id))
      and (company_id is null or private.can_access_record('company', company_id))
      and (opportunity_id is null or private.can_access_record('opportunity', opportunity_id))
    )
  )
);

drop policy conversations_authorized_insert on public.conversations;
create policy conversations_authorized_insert
on public.conversations
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.can_create_root('inbox', owner_id)
    and private.can_access_record('person', person_id)
    and (enquiry_id is null or private.can_access_record('enquiry', enquiry_id))
  )
);
drop policy conversations_authorized_update on public.conversations;
create policy conversations_authorized_update
on public.conversations
for update to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('inbox', 'reply')
    and private.can_access_record('conversation', id)
  )
)
with check (
  private.owner_id_matches(owner_id)
  and (
    private.is_owner()
    or (
      private.has_module_capability('inbox', 'reply')
      and private.can_access_record('conversation', id)
      and private.can_access_record('person', person_id)
      and (enquiry_id is null or private.can_access_record('enquiry', enquiry_id))
    )
  )
);

drop policy if exists enquiries_owner on public.enquiries;
create policy enquiries_authorized_select
on public.enquiries
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('people', 'view')
    and private.can_access_record('enquiry', id)
  )
);
create policy enquiries_authorized_insert
on public.enquiries
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.can_create_root('people', owner_id)
    and private.can_access_record('person', person_id)
    and (company_id is null or private.can_access_record('company', company_id))
  )
);
create policy enquiries_authorized_update
on public.enquiries
for update to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('people', 'edit')
    and private.can_access_record('enquiry', id)
  )
)
with check (
  private.owner_id_matches(owner_id)
  and (
    private.is_owner()
    or (
      private.has_module_capability('people', 'edit')
      and private.can_access_record('enquiry', id)
      and private.can_access_record('person', person_id)
      and (company_id is null or private.can_access_record('company', company_id))
    )
  )
);
create policy enquiries_owner_delete
on public.enquiries
for delete to authenticated
using (private.is_owner());

drop policy if exists tasks_owner on public.tasks;
create policy tasks_authorized_select
on public.tasks
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('tasks', 'view')
    and private.can_access_record('task', id)
  )
);
create policy tasks_authorized_insert
on public.tasks
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.can_create_root('tasks', owner_id)
    and (project_id is null or private.can_access_record('project', project_id))
    and (parent_task_id is null or private.can_access_record('task', parent_task_id))
  )
);
create policy tasks_authorized_update
on public.tasks
for update to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('tasks', 'edit')
    and private.can_access_record('task', id)
  )
)
with check (
  private.owner_id_matches(owner_id)
  and (
    private.is_owner()
    or (
      private.has_module_capability('tasks', 'edit')
      and private.can_access_record('task', id)
      and (project_id is null or private.can_access_record('project', project_id))
      and (parent_task_id is null or private.can_access_record('task', parent_task_id))
    )
  )
);
create policy tasks_owner_delete
on public.tasks
for delete to authenticated
using (private.is_owner());

do $$
declare
  policy_record record;
begin
  for policy_record in
    select * from (
      values
        ('milestones', 'projects', 'project', 'project_id'),
        ('task_groups', 'projects', 'project', 'project_id'),
        ('task_checklist_items', 'tasks', 'task', 'task_id'),
        ('task_comments', 'tasks', 'task', 'task_id'),
        ('task_recurrences', 'tasks', 'task', 'source_task_id')
    ) as configured(table_name, module_key, parent_entity_type, parent_column)
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.table_name || '_owner',
      policy_record.table_name
    );

    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_owner() or (private.has_module_capability(%L, ''view'') and private.can_access_record(%L, %I)))',
      policy_record.table_name || '_authorized_select',
      policy_record.table_name,
      policy_record.module_key,
      policy_record.parent_entity_type,
      policy_record.parent_column
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.is_owner() or (private.has_module_capability(%L, ''create'') and private.owner_id_matches(owner_id) and private.can_access_record(%L, %I)))',
      policy_record.table_name || '_authorized_insert',
      policy_record.table_name,
      policy_record.module_key,
      policy_record.parent_entity_type,
      policy_record.parent_column
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (private.is_owner() or (private.has_module_capability(%L, ''edit'') and private.can_access_record(%L, %I))) with check (private.owner_id_matches(owner_id) and (private.is_owner() or (private.has_module_capability(%L, ''edit'') and private.can_access_record(%L, %I))))',
      policy_record.table_name || '_authorized_update',
      policy_record.table_name,
      policy_record.module_key,
      policy_record.parent_entity_type,
      policy_record.parent_column,
      policy_record.module_key,
      policy_record.parent_entity_type,
      policy_record.parent_column
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.is_owner())',
      policy_record.table_name || '_owner_delete',
      policy_record.table_name
    );
  end loop;
end;
$$;

drop policy if exists company_people_owner on public.company_people;
create policy company_people_authorized_select
on public.company_people
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('people', 'view')
    and private.can_access_record('person', person_id)
    and private.can_access_record('company', company_id)
  )
);
create policy company_people_authorized_insert
on public.company_people
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.has_module_capability('people', 'create')
    and private.owner_id_matches(owner_id)
    and private.can_access_record('person', person_id)
    and private.can_access_record('company', company_id)
  )
);
create policy company_people_authorized_update
on public.company_people
for update to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('people', 'edit')
    and private.can_access_record('person', person_id)
    and private.can_access_record('company', company_id)
  )
)
with check (
  private.owner_id_matches(owner_id)
  and (
    private.is_owner()
    or (
      private.has_module_capability('people', 'edit')
      and private.can_access_record('person', person_id)
      and private.can_access_record('company', company_id)
    )
  )
);
create policy company_people_owner_delete
on public.company_people
for delete to authenticated
using (private.is_owner());

drop policy if exists tags_owner on public.tags;
create policy tags_authorized_select
on public.tags
for select to authenticated
using (private.is_owner() or private.has_module_capability('people', 'view'));
create policy tags_authorized_insert
on public.tags
for insert to authenticated
with check (private.can_create_root('people', owner_id));
create policy tags_authorized_update
on public.tags
for update to authenticated
using (private.is_owner() or private.has_module_capability('people', 'edit'))
with check (
  private.owner_id_matches(owner_id)
  and (private.is_owner() or private.has_module_capability('people', 'edit'))
);
create policy tags_owner_delete
on public.tags
for delete to authenticated
using (private.is_owner());

drop policy if exists entity_tags_owner on public.entity_tags;
create policy entity_tags_authorized_select
on public.entity_tags
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('people', 'view')
    and private.can_access_entity_reference(entity_type, entity_id)
  )
);
create policy entity_tags_authorized_insert
on public.entity_tags
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.has_module_capability('people', 'edit')
    and private.owner_id_matches(owner_id)
    and private.can_access_entity_reference(entity_type, entity_id)
  )
);
create policy entity_tags_owner_delete
on public.entity_tags
for delete to authenticated
using (private.is_owner());

drop policy if exists opportunity_stage_history_owner on public.opportunity_stage_history;
create policy opportunity_stage_history_authorized_select
on public.opportunity_stage_history
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('pipeline', 'view')
    and private.can_access_record('opportunity', opportunity_id)
  )
);
create policy opportunity_stage_history_authorized_insert
on public.opportunity_stage_history
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.has_module_capability('pipeline', 'edit')
    and private.owner_id_matches(owner_id)
    and private.can_access_record('opportunity', opportunity_id)
  )
);
create policy opportunity_stage_history_owner_delete
on public.opportunity_stage_history
for delete to authenticated
using (private.is_owner());

drop policy if exists task_dependencies_owner on public.task_dependencies;
create policy task_dependencies_authorized_select
on public.task_dependencies
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('tasks', 'view')
    and private.can_access_record('task', task_id)
    and private.can_access_record('task', depends_on_task_id)
  )
);
create policy task_dependencies_authorized_insert
on public.task_dependencies
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.has_module_capability('tasks', 'edit')
    and private.owner_id_matches(owner_id)
    and private.can_access_record('task', task_id)
    and private.can_access_record('task', depends_on_task_id)
  )
);
create policy task_dependencies_owner_delete
on public.task_dependencies
for delete to authenticated
using (private.is_owner());

drop policy if exists time_entries_owner on public.time_entries;
create policy time_entries_authorized_select
on public.time_entries
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('tasks', 'view')
    and (
      (task_id is not null and private.can_access_record('task', task_id))
      or (project_id is not null and private.can_access_record('project', project_id))
    )
  )
);
create policy time_entries_authorized_insert
on public.time_entries
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.has_module_capability('tasks', 'create')
    and private.owner_id_matches(owner_id)
    and (task_id is null or private.can_access_record('task', task_id))
    and (project_id is null or private.can_access_record('project', project_id))
    and (task_id is not null or project_id is not null)
  )
);
create policy time_entries_authorized_update
on public.time_entries
for update to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('tasks', 'edit')
    and (
      (task_id is not null and private.can_access_record('task', task_id))
      or (project_id is not null and private.can_access_record('project', project_id))
    )
  )
)
with check (
  private.owner_id_matches(owner_id)
  and (
    private.is_owner()
    or (
      private.has_module_capability('tasks', 'edit')
      and (task_id is null or private.can_access_record('task', task_id))
      and (project_id is null or private.can_access_record('project', project_id))
    )
  )
);
create policy time_entries_owner_delete
on public.time_entries
for delete to authenticated
using (private.is_owner());

do $$
declare
  table_name text;
  entity_type text;
begin
  foreach table_name in array array['slot_requests', 'appointments']
  loop
    entity_type := case table_name
      when 'slot_requests' then 'slot_request'
      else 'appointment'
    end;

    execute format('drop policy if exists %I on public.%I', table_name || '_owner', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_owner() or (private.has_module_capability(''calendar'', ''view'') and private.can_access_record(%L, id)))',
      table_name || '_authorized_select',
      table_name,
      entity_type
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.is_owner())',
      table_name || '_owner_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.is_owner() or ((private.has_module_capability(''calendar'', ''edit'') or private.has_module_capability(''calendar'', ''move'')) and private.can_access_record(%L, id))) with check (private.owner_id_matches(owner_id) and (private.is_owner() or ((private.has_module_capability(''calendar'', ''edit'') or private.has_module_capability(''calendar'', ''move'')) and private.can_access_record(%L, id))))',
      table_name || '_authorized_update',
      table_name,
      entity_type,
      entity_type
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.is_owner())',
      table_name || '_owner_delete',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists messages_owner on public.messages;
create policy messages_authorized_select
on public.messages
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('inbox', 'view')
    and private.can_access_record('conversation', conversation_id)
  )
);
create policy messages_authorized_insert
on public.messages
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.has_module_capability('inbox', 'reply')
    and private.owner_id_matches(owner_id)
    and private.can_access_record('conversation', conversation_id)
    and direction = 'outbound'
  )
);
create policy messages_owner_update
on public.messages
for update to authenticated
using (private.is_owner())
with check (private.is_owner());
create policy messages_owner_delete
on public.messages
for delete to authenticated
using (private.is_owner());

drop policy if exists entity_files_owner on public.entity_files;
create policy entity_files_authorized_select
on public.entity_files
for select to authenticated
using (
  private.is_owner()
  or (
    private.has_module_capability('files', 'view')
    and private.can_access_record('file', file_id)
    and private.can_access_entity_reference(entity_type, entity_id)
  )
);
create policy entity_files_authorized_insert
on public.entity_files
for insert to authenticated
with check (
  private.is_owner()
  or (
    private.has_module_capability('files', 'upload')
    and private.owner_id_matches(owner_id)
    and private.can_access_record('file', file_id)
    and private.can_access_entity_reference(entity_type, entity_id)
  )
);
create policy entity_files_owner_delete
on public.entity_files
for delete to authenticated
using (private.is_owner());

drop policy if exists notifications_owner on public.notifications;
create policy notifications_self
on public.notifications
for all to authenticated
using (
  private.is_owner()
  or (
    private.is_active_collaborator()
    and owner_id = (select auth.uid())
  )
)
with check (
  private.is_owner()
  or (
    private.is_active_collaborator()
    and owner_id = (select auth.uid())
  )
);

drop policy if exists saved_views_owner on public.saved_views;
create policy saved_views_self
on public.saved_views
for all to authenticated
using (
  private.is_owner()
  or (
    private.is_active_collaborator()
    and owner_id = (select auth.uid())
  )
)
with check (
  private.is_owner()
  or (
    private.is_active_collaborator()
    and owner_id = (select auth.uid())
  )
);

drop policy if exists client_files_owner_select on storage.objects;
drop policy if exists client_files_owner_insert on storage.objects;
drop policy if exists client_files_owner_update on storage.objects;
drop policy if exists client_files_owner_delete on storage.objects;

create policy client_files_authorized_select
on storage.objects
for select to authenticated
using (
  bucket_id = 'client-files'
  and private.is_aal2()
  and (
    private.is_owner()
    or (
      private.has_module_capability('files', 'view')
      and exists (
        select 1
        from public.files file
        where file.storage_path = name
          and private.can_access_record('file', file.id)
      )
    )
  )
);

create policy client_files_authorized_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'client-files'
  and private.is_aal2()
  and (
    (
      private.is_owner()
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
    or (
      private.has_module_capability('files', 'upload')
      and exists (
        select 1
        from public.app_profiles profile
        where profile.is_owner
          and profile.account_state = 'active'
          and profile.user_id::text = (storage.foldername(name))[1]
      )
    )
  )
);

create policy client_files_authorized_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'client-files'
  and private.is_aal2()
  and (
    private.is_owner()
    or (
      private.has_module_capability('files', 'upload')
      and exists (
        select 1
        from public.files file
        where file.storage_path = name
          and private.can_access_record('file', file.id)
      )
    )
  )
)
with check (
  bucket_id = 'client-files'
  and private.is_aal2()
  and (
    private.is_owner()
    or (
      private.has_module_capability('files', 'upload')
      and exists (
        select 1
        from public.files file
        where file.storage_path = name
          and private.can_access_record('file', file.id)
      )
    )
  )
);

create policy client_files_owner_delete
on storage.objects
for delete to authenticated
using (bucket_id = 'client-files' and private.is_owner());

create or replace function public.replace_collaborator_access(
  p_user_id uuid,
  p_permissions jsonb,
  p_assignments jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile public.app_profiles;
  permission_record record;
  assignment_value jsonb;
  assignment_type text;
  assignment_id uuid;
  assignment_exists boolean;
  owner_id uuid;
begin
  if not private.is_owner() then
    raise exception 'Owner access required.' using errcode = '42501';
  end if;

  select * into target_profile
  from public.app_profiles profile
  where profile.user_id = p_user_id
  for update;

  if target_profile.user_id is null or target_profile.is_owner then
    raise exception 'Collaborator account not found.' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_permissions) <> 'object'
    or jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'Invalid collaborator access payload.' using errcode = '22023';
  end if;

  delete from public.module_permissions where user_id = p_user_id;
  delete from public.record_assignments where user_id = p_user_id;

  for permission_record in
    select key as module_key, value as capabilities
    from jsonb_each(p_permissions)
  loop
    if jsonb_typeof(permission_record.capabilities) <> 'array' then
      raise exception 'Module capabilities must be arrays.' using errcode = '22023';
    end if;

    insert into public.module_permissions (user_id, module_key, capabilities)
    values (
      p_user_id,
      permission_record.module_key,
      array(
        select distinct jsonb_array_elements_text(permission_record.capabilities)
        order by 1
      )
    );
  end loop;

  for assignment_value in select value from jsonb_array_elements(p_assignments)
  loop
    assignment_type := assignment_value->>'entityType';
    assignment_id := (assignment_value->>'entityId')::uuid;
    assignment_exists := case assignment_type
      when 'person' then exists (select 1 from public.people where id = assignment_id)
      when 'company' then exists (select 1 from public.companies where id = assignment_id)
      when 'enquiry' then exists (select 1 from public.enquiries where id = assignment_id)
      when 'opportunity' then exists (select 1 from public.opportunities where id = assignment_id)
      when 'project' then exists (select 1 from public.projects where id = assignment_id)
      when 'task' then exists (select 1 from public.tasks where id = assignment_id)
      when 'blocked_period' then exists (select 1 from public.blocked_periods where id = assignment_id)
      when 'slot_request' then exists (select 1 from public.slot_requests where id = assignment_id)
      when 'appointment' then exists (select 1 from public.appointments where id = assignment_id)
      when 'conversation' then exists (select 1 from public.conversations where id = assignment_id)
      when 'file' then exists (select 1 from public.files where id = assignment_id)
      else false
    end;

    if not assignment_exists then
      raise exception 'Assigned record not found.' using errcode = 'P0002';
    end if;

    insert into public.record_assignments (
      user_id,
      entity_type,
      entity_id,
      assigned_by
    )
    values (
      p_user_id,
      assignment_type,
      assignment_id,
      (select auth.uid())
    );
  end loop;

  select profile.user_id into owner_id
  from public.app_profiles profile
  where profile.is_owner and profile.account_state = 'active'
  limit 1;

  insert into public.audit_events (
    owner_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    owner_id,
    (select auth.uid()),
    'access_updated',
    'collaborator',
    p_user_id::text,
    jsonb_build_object(
      'moduleCount', (select count(*) from jsonb_object_keys(p_permissions)),
      'assignmentCount', jsonb_array_length(p_assignments)
    )
  );
end;
$$;

create or replace function public.set_collaborator_state(
  p_user_id uuid,
  p_state public.collaborator_state
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile public.app_profiles;
  owner_id uuid;
begin
  if not private.is_owner() then
    raise exception 'Owner access required.' using errcode = '42501';
  end if;

  if p_state = 'invited' then
    raise exception 'An account cannot return to invited state.' using errcode = '22023';
  end if;

  select * into target_profile
  from public.app_profiles profile
  where profile.user_id = p_user_id
  for update;

  if target_profile.user_id is null or target_profile.is_owner then
    raise exception 'Collaborator account not found.' using errcode = 'P0002';
  end if;

  update public.app_profiles
  set account_state = p_state,
      revoked_at = case when p_state = 'revoked' then now() else null end
  where user_id = p_user_id;

  if p_state in ('suspended', 'revoked') then
    delete from public.record_assignments where user_id = p_user_id;
    update public.app_sessions set revoked_at = coalesce(revoked_at, now())
    where user_id = p_user_id and revoked_at is null;
    delete from auth.sessions where user_id = p_user_id;
  end if;

  select profile.user_id into owner_id
  from public.app_profiles profile
  where profile.is_owner and profile.account_state = 'active'
  limit 1;

  insert into public.audit_events (
    owner_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    owner_id,
    (select auth.uid()),
    'state_changed',
    'collaborator',
    p_user_id::text,
    jsonb_build_object('from', target_profile.account_state, 'to', p_state)
  );
end;
$$;

create or replace function public.touch_app_session(
  p_device_metadata jsonb,
  p_ip_hash text
)
returns public.app_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_session_id uuid;
  result public.app_sessions;
begin
  if not private.is_aal2() then
    raise exception 'Authenticator verification is required.' using errcode = '42501';
  end if;

  jwt_session_id := nullif((select auth.jwt()->>'session_id'), '')::uuid;
  if jwt_session_id is null or (select auth.uid()) is null then
    raise exception 'The current session is unavailable.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_device_metadata) <> 'object' then
    raise exception 'Invalid device metadata.' using errcode = '22023';
  end if;

  insert into public.app_sessions (
    user_id,
    session_id,
    device_metadata,
    ip_hash,
    last_active_at,
    revoked_at
  )
  values (
    (select auth.uid()),
    jwt_session_id,
    p_device_metadata,
    p_ip_hash,
    now(),
    null
  )
  on conflict (session_id) do update
  set device_metadata = excluded.device_metadata,
      ip_hash = excluded.ip_hash,
      last_active_at = now(),
      revoked_at = null
  where public.app_sessions.user_id = (select auth.uid())
  returning * into result;

  return result;
end;
$$;

create or replace function public.revoke_app_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_aal2() then
    raise exception 'Authenticator verification is required.' using errcode = '42501';
  end if;

  update public.app_sessions
  set revoked_at = coalesce(revoked_at, now())
  where session_id = p_session_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Session not found.' using errcode = 'P0002';
  end if;

  delete from auth.sessions
  where id = p_session_id
    and user_id = (select auth.uid());
end;
$$;

create or replace function public.revoke_other_app_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session_id uuid;
  revoked_count integer;
begin
  if not private.is_aal2() then
    raise exception 'Authenticator verification is required.' using errcode = '42501';
  end if;

  current_session_id := nullif((select auth.jwt()->>'session_id'), '')::uuid;
  if current_session_id is null then
    raise exception 'The current session is unavailable.' using errcode = '42501';
  end if;

  update public.app_sessions
  set revoked_at = coalesce(revoked_at, now())
  where user_id = (select auth.uid())
    and session_id <> current_session_id
    and revoked_at is null;
  get diagnostics revoked_count = row_count;

  delete from auth.sessions
  where user_id = (select auth.uid())
    and id <> current_session_id;

  return revoked_count;
end;
$$;

revoke execute on function public.replace_collaborator_access(uuid, jsonb, jsonb)
from public, anon;
revoke execute on function public.set_collaborator_state(uuid, public.collaborator_state)
from public, anon;
revoke execute on function public.touch_app_session(jsonb, text)
from public, anon;
revoke execute on function public.revoke_app_session(uuid)
from public, anon;
revoke execute on function public.revoke_other_app_sessions()
from public, anon;

grant execute on function public.replace_collaborator_access(uuid, jsonb, jsonb)
to authenticated;
grant execute on function public.set_collaborator_state(uuid, public.collaborator_state)
to authenticated;
grant execute on function public.touch_app_session(jsonb, text)
to authenticated;
grant execute on function public.revoke_app_session(uuid)
to authenticated;
grant execute on function public.revoke_other_app_sessions()
to authenticated;
