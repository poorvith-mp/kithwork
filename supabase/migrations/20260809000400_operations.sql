create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  enabled boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  break_start time,
  break_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, weekday),
  check (start_time < end_time),
  check ((break_start is null and break_end is null) or (break_start < break_end and break_start >= start_time and break_end <= end_time))
);

create table public.blocked_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Unavailable',
  start_at timestamptz not null,
  end_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);
create index blocked_periods_owner_time_idx on public.blocked_periods(owner_id,start_at,end_at);

create table public.slot_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete restrict,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','declined','rescheduled','cancelled')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  visitor_timezone text not null,
  owner_note text,
  client_note text,
  decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);
create index slot_requests_owner_time_idx on public.slot_requests(owner_id,start_at,status);
create unique index slot_requests_active_start_unique on public.slot_requests(owner_id,start_at) where status in ('pending','approved');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slot_request_id uuid unique references public.slot_requests(id) on delete set null,
  person_id uuid not null references public.people(id) on delete restrict,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  title text not null default 'Workspace conversation',
  status text not null default 'confirmed' check (status in ('confirmed','completed','cancelled','rescheduled','no_show')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  visitor_timezone text not null,
  notes text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);
create index appointments_owner_time_idx on public.appointments(owner_id,start_at,status);
create unique index appointments_active_start_unique on public.appointments(owner_id,start_at) where status='confirmed';

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete restrict,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  subject text not null,
  status text not null default 'open' check (status in ('open','waiting','closed','archived')),
  reply_needed boolean not null default false,
  reply_token text not null default encode(gen_random_bytes(24),'hex') unique,
  last_message_at timestamptz not null default now(),
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_attention_idx on public.conversations(owner_id,reply_needed,last_message_at desc) where deleted_at is null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  channel text not null default 'email' check (channel in ('email','web')),
  sender_email text not null,
  recipient_email text not null,
  subject text,
  body_text text not null,
  status text not null default 'queued' check (status in ('received','queued','sent','delivered','delayed','bounced','complained','failed')),
  provider_message_id text unique,
  in_reply_to text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id,created_at);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  kind text not null check (kind in ('reply','appointment_confirmation','appointment_change','appointment_reminder','campaign','system')),
  recipient_email text not null,
  subject text not null,
  body_text text not null,
  reply_to text,
  send_after timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempts smallint not null default 0,
  last_error text,
  provider_message_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_outbox_due_idx on public.email_outbox(status,send_after) where status='pending';

create table public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  kind text not null default 'one_day_before' check (kind='one_day_before'),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','queued','sent','cancelled','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id,kind)
);
create index reminder_jobs_due_idx on public.reminder_jobs(status,due_at) where status='pending';

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider_event_id text not null unique,
  provider_message_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index email_events_owner_time_idx on public.email_events(owner_id,occurred_at desc);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique(provider,provider_event_id)
);

create table public.suppressions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('unsubscribed','bounced','complained','manual')),
  source text not null,
  created_at timestamptz not null default now(),
  unique(owner_id,email)
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  safe_name text not null,
  extension text not null check (extension in ('md','pdf','doc','docx','xlsx')),
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  source text not null check (source in ('public_intake','owner_upload')),
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now()
);
create index files_owner_created_idx on public.files(owner_id,created_at desc) where deleted_at is null;

create table public.entity_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  entity_type text not null check (entity_type in ('person','company','enquiry','opportunity','project','task','conversation')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique(file_id,entity_type,entity_id)
);
create index entity_files_entity_idx on public.entity_files(owner_id,entity_type,entity_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','queued','sent','skipped','failed')),
  reason text,
  created_at timestamptz not null default now(),
  unique(campaign_id,person_id)
);

do $$
declare table_name text;
begin
  foreach table_name in array array['availability_rules','blocked_periods','slot_requests','appointments','conversations','messages','email_outbox','reminder_jobs','email_events','suppressions','files','entity_files','campaigns','campaign_recipients']
  loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',table_name||'_owner',table_name);
    execute format('create policy %I on public.%I as restrictive for all to authenticated using ((select auth.jwt()->>''aal'')=''aal2'') with check ((select auth.jwt()->>''aal'')=''aal2'')',table_name||'_mfa',table_name);
    execute format('grant select,insert,update,delete on public.%I to authenticated',table_name);
  end loop;
end $$;
alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from anon,authenticated;
revoke all on all tables in schema public from anon;

do $$
declare table_name text;
begin
  foreach table_name in array array['availability_rules','blocked_periods','slot_requests','appointments','conversations','email_outbox','reminder_jobs','campaigns']
  loop execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()',table_name||'_updated_at',table_name); end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-files','client-files',false,5242880,array['text/markdown','text/plain','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy client_files_owner_select on storage.objects for select to authenticated
using (bucket_id='client-files' and (storage.foldername(name))[1]=(select auth.uid())::text and (select auth.jwt()->>'aal')='aal2');
create policy client_files_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='client-files' and (storage.foldername(name))[1]=(select auth.uid())::text and (select auth.jwt()->>'aal')='aal2');
create policy client_files_owner_update on storage.objects for update to authenticated
using (bucket_id='client-files' and (storage.foldername(name))[1]=(select auth.uid())::text and (select auth.jwt()->>'aal')='aal2')
with check (bucket_id='client-files' and (storage.foldername(name))[1]=(select auth.uid())::text and (select auth.jwt()->>'aal')='aal2');
create policy client_files_owner_delete on storage.objects for delete to authenticated
using (bucket_id='client-files' and (storage.foldername(name))[1]=(select auth.uid())::text and (select auth.jwt()->>'aal')='aal2');

create or replace function private.seed_owner_availability(p_owner_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.availability_rules(owner_id,weekday,enabled,start_time,end_time,break_start,break_end)
  select p_owner_id,d,d between 1 and 5,'09:00'::time,'18:00'::time,'13:00'::time,'14:00'::time
  from generate_series(0,6) d on conflict(owner_id,weekday) do nothing;
end; $$;
revoke execute on function private.seed_owner_availability(uuid) from public,anon,authenticated;

select private.seed_owner_availability(owner_id) from public.owner_settings;

create or replace function private.seed_owner_availability_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.seed_owner_availability(new.owner_id); return new; end; $$;
revoke execute on function private.seed_owner_availability_trigger() from public, anon, authenticated;
create trigger owner_settings_seed_availability after insert on public.owner_settings
for each row execute function private.seed_owner_availability_trigger();

create or replace function public.reserve_public_slot(p_owner_id uuid,p_person_id uuid,p_enquiry_id uuid,p_start_at timestamptz,p_visitor_timezone text)
returns public.slot_requests
language plpgsql security definer set search_path='' as $$
declare
  local_start timestamp := p_start_at at time zone 'UTC';
  local_date date := local_start::date;
  local_time time := local_start::time;
  local_weekday smallint := extract(dow from local_start);
  rule public.availability_rules;
  result public.slot_requests;
  slot_end timestamptz;
  limit_count integer;
begin
  if p_start_at < now() + interval '2 hours' then raise exception 'This slot is too soon'; end if;
  if extract(second from local_time)<>0 or extract(minute from local_time)::int % 30<>0 then raise exception 'Invalid slot boundary'; end if;
  select * into rule from public.availability_rules where owner_id=p_owner_id and weekday=local_weekday and enabled=true;
  if rule.id is null then raise exception 'This day is unavailable'; end if;
  slot_end:=p_start_at+interval '30 minutes';
  if local_time<rule.start_time or local_time+interval '30 minutes'>rule.end_time then raise exception 'Outside working hours'; end if;
  if rule.break_start is not null and local_time<rule.break_end and local_time+interval '30 minutes'>rule.break_start then raise exception 'This time is unavailable'; end if;
  perform pg_advisory_xact_lock(hashtext(p_owner_id::text||local_date::text));
  if exists(select 1 from public.blocked_periods where owner_id=p_owner_id and start_at<slot_end and end_at>p_start_at) then raise exception 'This time is blocked'; end if;
  if exists(select 1 from public.slot_requests where owner_id=p_owner_id and status in('pending','approved') and start_at<slot_end and end_at>p_start_at) then raise exception 'This time has just been requested'; end if;
  if exists(select 1 from public.appointments where owner_id=p_owner_id and status='confirmed' and start_at<slot_end and end_at>p_start_at) then raise exception 'This time is no longer available'; end if;
  select count(*) into limit_count from public.slot_requests where owner_id=p_owner_id and status in('pending','approved') and (start_at at time zone 'UTC')::date=local_date;
  if limit_count>=5 then raise exception 'The daily request limit has been reached'; end if;
  insert into public.slot_requests(owner_id,person_id,enquiry_id,start_at,end_at,visitor_timezone)
  values(p_owner_id,p_person_id,p_enquiry_id,p_start_at,slot_end,p_visitor_timezone) returning * into result;
  return result;
end; $$;
revoke execute on function public.reserve_public_slot(uuid,uuid,uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.reserve_public_slot(uuid,uuid,uuid,timestamptz,text) to service_role;

create or replace function public.approve_slot_request(p_request_id uuid,p_owner_note text default null)
returns public.appointments language plpgsql security invoker set search_path='' as $$
declare request_row public.slot_requests; result public.appointments; recipient text;
begin
  select * into request_row from public.slot_requests where id=p_request_id for update;
  if request_row.id is null or request_row.status<>'pending' then raise exception 'Pending slot request not found'; end if;
  update public.slot_requests set status='approved',owner_note=p_owner_note,decision_at=now() where id=p_request_id;
  insert into public.appointments(owner_id,slot_request_id,person_id,enquiry_id,start_at,end_at,visitor_timezone)
  values(request_row.owner_id,request_row.id,request_row.person_id,request_row.enquiry_id,request_row.start_at,request_row.end_at,request_row.visitor_timezone)
  returning * into result;
  insert into public.reminder_jobs(owner_id,appointment_id,due_at) values(result.owner_id,result.id,result.start_at-interval '1 day');
  select p.email into recipient from public.people p where p.id=request_row.person_id;
  if recipient is not null then
    insert into public.email_outbox(owner_id,kind,recipient_email,subject,body_text,reply_to,idempotency_key)
    values(result.owner_id,'appointment_confirmation',recipient,'Conversation slot confirmed','Your conversation slot is confirmed for '||to_char(result.start_at at time zone 'UTC','DD Mon YYYY, HH12:MI AM')||' UTC.',null,'appointment-confirmation-'||result.id);
  end if;
  return result;
end; $$;
grant execute on function public.approve_slot_request(uuid,text) to authenticated;

create or replace function public.decline_slot_request(p_request_id uuid,p_owner_note text)
returns void language plpgsql security invoker set search_path='' as $$
declare request_row public.slot_requests; recipient text;
begin
  update public.slot_requests set status='declined',owner_note=p_owner_note,decision_at=now() where id=p_request_id and status='pending' returning * into request_row;
  if request_row.id is null then raise exception 'Pending slot request not found'; end if;
  select p.email into recipient from public.people p where p.id=request_row.person_id;
  if recipient is not null then
    insert into public.email_outbox(owner_id,kind,recipient_email,subject,body_text,reply_to,idempotency_key)
    values(request_row.owner_id,'appointment_change',recipient,'Conversation request update',p_owner_note,null,'slot-declined-'||request_row.id);
  end if;
end; $$;
grant execute on function public.decline_slot_request(uuid,text) to authenticated;

create or replace function public.reschedule_appointment(p_appointment_id uuid,p_start_at timestamptz,p_note text)
returns public.appointments language plpgsql security invoker set search_path='' as $$
declare current_row public.appointments; slot_end timestamptz:=p_start_at+interval '30 minutes'; result public.appointments;
begin
  select * into current_row from public.appointments where id=p_appointment_id for update;
  if current_row.id is null or current_row.status<>'confirmed' then raise exception 'Confirmed appointment not found'; end if;
  if exists(select 1 from public.blocked_periods where owner_id=current_row.owner_id and start_at<slot_end and end_at>p_start_at) then raise exception 'This time is blocked'; end if;
  if exists(select 1 from public.appointments where owner_id=current_row.owner_id and id<>current_row.id and status='confirmed' and start_at<slot_end and end_at>p_start_at) then raise exception 'This time is already booked'; end if;
  update public.appointments set start_at=p_start_at,end_at=slot_end,notes=p_note,reminder_sent_at=null where id=current_row.id returning * into result;
  update public.slot_requests set status='rescheduled',owner_note=p_note where id=current_row.slot_request_id;
  insert into public.reminder_jobs(owner_id,appointment_id,due_at,status) values(result.owner_id,result.id,result.start_at-interval '1 day','pending')
  on conflict(appointment_id,kind) do update set due_at=excluded.due_at,status='pending',updated_at=now();
  return result;
end; $$;
grant execute on function public.reschedule_appointment(uuid,timestamptz,text) to authenticated;

create or replace function public.cancel_appointment(p_appointment_id uuid,p_note text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  update public.appointments set status='cancelled',notes=p_note where id=p_appointment_id and status='confirmed';
  if not found then raise exception 'Confirmed appointment not found'; end if;
  update public.reminder_jobs set status='cancelled' where appointment_id=p_appointment_id and status='pending';
end; $$;
grant execute on function public.cancel_appointment(uuid,text) to authenticated;

create or replace function public.queue_conversation_reply(p_conversation_id uuid,p_body text)
returns public.messages language plpgsql security invoker set search_path='' as $$
declare conversation_row public.conversations; person_email text; sender_email text; result public.messages;
begin
  if nullif(btrim(p_body),'') is null then raise exception 'Message cannot be empty'; end if;
  select * into conversation_row from public.conversations where id=p_conversation_id;
  select email into person_email from public.people where id=conversation_row.person_id;
  select email into sender_email from public.owner_settings where owner_id=conversation_row.owner_id;
  if conversation_row.id is null or person_email is null then raise exception 'Conversation recipient not found'; end if;
  insert into public.messages(owner_id,conversation_id,direction,channel,sender_email,recipient_email,subject,body_text,status)
  values(conversation_row.owner_id,conversation_row.id,'outbound','email',sender_email,person_email,conversation_row.subject,p_body,'queued') returning * into result;
  insert into public.email_outbox(owner_id,message_id,kind,recipient_email,subject,body_text,reply_to,idempotency_key)
  values(conversation_row.owner_id,result.id,'reply',person_email,conversation_row.subject,p_body,null,'reply-'||result.id);
  update public.conversations set reply_needed=false,status='waiting',last_message_at=now() where id=conversation_row.id;
  return result;
end; $$;
grant execute on function public.queue_conversation_reply(uuid,text) to authenticated;

create or replace function public.claim_due_email_jobs(p_limit integer default 25)
returns setof public.email_outbox language plpgsql security definer set search_path='' as $$
begin
  return query update public.email_outbox set status='processing',attempts=attempts+1,updated_at=now()
  where id in(select id from public.email_outbox where status='pending' and send_after<=now() order by send_after for update skip locked limit least(p_limit,50))
  returning *;
end; $$;
revoke execute on function public.claim_due_email_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_due_email_jobs(integer) to service_role;

create or replace function public.prepare_due_reminders()
returns integer language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
  insert into public.email_outbox(owner_id,kind,recipient_email,subject,body_text,send_after,idempotency_key)
  select r.owner_id,'appointment_reminder',p.email,'Reminder: conversation tomorrow',
    'This is your one-day reminder for the conversation scheduled at '||to_char(a.start_at at time zone 'UTC','DD Mon YYYY, HH12:MI AM')||' UTC.',
    now(),'reminder-'||r.id
  from public.reminder_jobs r join public.appointments a on a.id=r.appointment_id join public.people p on p.id=a.person_id
  where r.status='pending' and r.due_at<=now() and a.status='confirmed' and p.email is not null
  on conflict(idempotency_key) do nothing;
  get diagnostics inserted_count=row_count;
  update public.reminder_jobs set status='queued',updated_at=now() where status='pending' and due_at<=now();
  return inserted_count;
end; $$;
revoke execute on function public.prepare_due_reminders() from public,anon,authenticated;
grant execute on function public.prepare_due_reminders() to service_role;

create or replace function public.purge_expired_trash()
returns integer language plpgsql security definer set search_path='' as $$
declare total integer:=0; affected integer; table_name text;
begin
  foreach table_name in array array['tasks','projects','opportunities','enquiries','companies','people','conversations','files'] loop
    execute format('delete from public.%I where deleted_at is not null and purge_after<=now()',table_name);
    get diagnostics affected=row_count; total:=total+affected;
  end loop;
  delete from public.intake_rate_limits where expires_at<=now();
  return total;
end; $$;
revoke execute on function public.purge_expired_trash() from public,anon,authenticated;
grant execute on function public.purge_expired_trash() to service_role;
