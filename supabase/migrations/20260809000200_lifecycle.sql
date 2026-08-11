create table public.people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text,
  email text,
  normalized_email text generated always as (lower(btrim(email))) stored,
  phone text,
  relationship_status text not null default 'lead' check (relationship_status in ('lead','prospect','active_client','past_client')),
  source text not null default 'manual',
  notes text,
  last_contact_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index people_active_email_unique on public.people (owner_id, normalized_email) where normalized_email is not null and deleted_at is null;
create index people_owner_status_idx on public.people (owner_id, relationship_status, updated_at desc) where deleted_at is null;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  website text,
  email text,
  phone text,
  industry text,
  status text not null default 'prospect' check (status in ('lead','prospect','active_client','past_client')),
  notes text,
  archived_at timestamptz,
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index companies_owner_status_idx on public.companies (owner_id, status, updated_at desc) where deleted_at is null;
create unique index companies_owner_name_unique on public.companies (owner_id, lower(name)) where deleted_at is null;

create table public.company_people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  job_title text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, person_id)
);
create index company_people_owner_idx on public.company_people (owner_id);
create index company_people_person_idx on public.company_people (person_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#087f5b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.entity_tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  entity_type text not null check (entity_type in ('person','company','enquiry','opportunity','project','task')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tag_id, entity_type, entity_id)
);
create index entity_tags_entity_idx on public.entity_tags (owner_id, entity_type, entity_id);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete restrict,
  company_id uuid references public.companies(id) on delete set null,
  category text not null check (category in ('feedback','hire','request','support','manual')),
  subject text,
  message text not null,
  service_interest text,
  status text not null default 'new' check (status in ('new','reviewing','conversation_requested','qualified','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  next_action text,
  next_action_due_at timestamptz,
  source text not null default 'public_site',
  qualified_at timestamptz,
  closed_at timestamptz,
  closed_reason text,
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_attention_idx on public.enquiries (owner_id, status, priority, created_at desc) where deleted_at is null;
create index enquiries_person_idx on public.enquiries (person_id, created_at desc);
create index enquiries_company_idx on public.enquiries (company_id) where company_id is not null;

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete restrict,
  company_id uuid references public.companies(id) on delete set null,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  title text not null,
  service_interest text,
  stage text not null default 'discovery' check (stage in ('discovery','proposal','negotiation','won','lost','on_hold')),
  expected_value numeric(12,2) check (expected_value is null or expected_value >= 0),
  probability smallint check (probability is null or probability between 0 and 100),
  expected_close_date date,
  next_action text,
  next_action_due_at timestamptz,
  notes text,
  stage_reason text,
  won_at timestamptz,
  lost_at timestamptz,
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunities_pipeline_idx on public.opportunities (owner_id, stage, updated_at desc) where deleted_at is null;
create index opportunities_person_idx on public.opportunities (person_id, created_at desc);
create index opportunities_company_idx on public.opportunities (company_id) where company_id is not null;

create table public.opportunity_stage_history (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  reason text,
  changed_at timestamptz not null default now()
);
create index opportunity_history_opportunity_idx on public.opportunity_stage_history (opportunity_id, changed_at desc);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  public_reference text not null unique,
  idempotency_key text not null,
  category text not null,
  payload jsonb not null,
  origin text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);
create index form_submissions_owner_created_idx on public.form_submissions (owner_id, created_at desc);

create table public.marketing_consents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  state text not null check (state in ('subscribed','unsubscribed')),
  source text not null,
  policy_version text not null default '2026-08-09',
  evidence jsonb not null default '{}'::jsonb,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);
create index marketing_consents_person_idx on public.marketing_consents (person_id, created_at desc);

create table public.intake_rate_limits (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count smallint not null default 1,
  expires_at timestamptz not null,
  unique (owner_id, key_hash, window_started_at)
);
create index intake_rate_limits_expiry_idx on public.intake_rate_limits (expires_at);

create or replace function public.claim_intake_rate_limit(p_owner_id uuid, p_key_hash text, p_limit smallint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare current_count smallint;
declare current_window timestamptz := date_trunc('hour', now());
begin
  insert into public.intake_rate_limits(owner_id,key_hash,window_started_at,request_count,expires_at)
  values(p_owner_id,p_key_hash,current_window,1,current_window + interval '2 hours')
  on conflict(owner_id,key_hash,window_started_at)
  do update set request_count=public.intake_rate_limits.request_count+1
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;
revoke execute on function public.claim_intake_rate_limit(uuid,text,smallint) from public, anon, authenticated;
grant execute on function public.claim_intake_rate_limit(uuid,text,smallint) to service_role;

do $$
declare table_name text;
begin
  foreach table_name in array array['people','companies','company_people','tags','entity_tags','enquiries','opportunities','opportunity_stage_history','form_submissions','marketing_consents']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', table_name || '_owner', table_name);
    execute format('create policy %I on public.%I as restrictive for all to authenticated using ((select auth.jwt()->>''aal'') = ''aal2'') with check ((select auth.jwt()->>''aal'') = ''aal2'')', table_name || '_mfa', table_name);
  end loop;
end $$;
alter table public.intake_rate_limits enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['people','companies','company_people','tags','entity_tags','enquiries','opportunities','form_submissions','marketing_consents']
  loop execute format('grant select, insert, update, delete on public.%I to authenticated', table_name); end loop;
end $$;
grant select on public.opportunity_stage_history to authenticated;
revoke all on public.intake_rate_limits from anon, authenticated;
revoke all on all tables in schema public from anon;

do $$
declare table_name text;
begin
  foreach table_name in array array['people','companies','enquiries','opportunities']
  loop execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', table_name || '_updated_at', table_name); end loop;
end $$;

create or replace function public.change_opportunity_stage(p_opportunity_id uuid, p_stage text, p_reason text default null)
returns public.opportunities
language plpgsql
security invoker
set search_path = ''
as $$
declare current_row public.opportunities;
begin
  if p_stage not in ('discovery','proposal','negotiation','won','lost','on_hold') then raise exception 'Invalid opportunity stage'; end if;
  select * into current_row from public.opportunities where id = p_opportunity_id for update;
  if current_row.id is null then raise exception 'Opportunity not found'; end if;
  if p_stage in ('lost','on_hold') and nullif(btrim(p_reason),'') is null then raise exception 'A reason is required'; end if;
  insert into public.opportunity_stage_history(owner_id, opportunity_id, from_stage, to_stage, reason)
  values(current_row.owner_id, current_row.id, current_row.stage, p_stage, p_reason);
  update public.opportunities set stage=p_stage, stage_reason=p_reason,
    won_at=case when p_stage='won' then now() else won_at end,
    lost_at=case when p_stage='lost' then now() else lost_at end,
    updated_at=now() where id=current_row.id returning * into current_row;
  return current_row;
end;
$$;
grant execute on function public.change_opportunity_stage(uuid,text,text) to authenticated;
