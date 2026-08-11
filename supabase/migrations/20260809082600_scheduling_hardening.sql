create extension if not exists btree_gist with schema extensions;

alter table public.slot_requests
add constraint slot_requests_no_active_overlap
exclude using gist (
  owner_id with =,
  tstzrange(start_at, end_at, '[)') with &&
)
where (status in ('pending', 'approved'));

alter table public.appointments
add constraint appointments_no_confirmed_overlap
exclude using gist (
  owner_id with =,
  tstzrange(start_at, end_at, '[)') with &&
)
where (status = 'confirmed');

create or replace function public.reserve_public_slot(
  p_owner_id uuid,
  p_person_id uuid,
  p_enquiry_id uuid,
  p_start_at timestamptz,
  p_visitor_timezone text
)
returns public.slot_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_start timestamp := p_start_at at time zone 'UTC';
  local_date date := local_start::date;
  local_time time := local_start::time;
  local_weekday smallint := extract(dow from local_start);
  rule public.availability_rules;
  result public.slot_requests;
  slot_end timestamptz;
  slot_minutes smallint;
  daily_limit smallint;
  limit_count integer;
begin
  if p_start_at < now() + interval '2 hours'
    or p_start_at >= now() + interval '57 days'
  then
    raise exception 'This slot is outside the booking horizon.' using errcode = '22023';
  end if;
  if nullif(btrim(p_visitor_timezone), '') is null
    or length(p_visitor_timezone) > 100
  then
    raise exception 'A valid visitor timezone is required.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.people
    where id = p_person_id and owner_id = p_owner_id and deleted_at is null
  ) or not exists (
    select 1 from public.enquiries
    where id = p_enquiry_id and owner_id = p_owner_id and person_id = p_person_id
  ) then
    raise exception 'The scheduling request is invalid.' using errcode = '22023';
  end if;

  select settings.conversation_minutes, settings.daily_conversation_limit
  into slot_minutes, daily_limit
  from public.owner_settings settings
  where settings.owner_id = p_owner_id;
  if slot_minutes is null or slot_minutes <> 30 then
    raise exception 'Scheduling is not configured.' using errcode = '55000';
  end if;
  if extract(second from local_time) <> 0
    or extract(minute from local_time)::int % slot_minutes <> 0
  then
    raise exception 'Invalid slot boundary.' using errcode = '22023';
  end if;

  select * into rule
  from public.availability_rules
  where owner_id = p_owner_id and weekday = local_weekday and enabled;
  if rule.id is null then
    raise exception 'This day is unavailable.' using errcode = '22023';
  end if;

  slot_end := p_start_at + make_interval(mins => slot_minutes);
  if local_time < rule.start_time
    or local_time + make_interval(mins => slot_minutes) > rule.end_time
  then
    raise exception 'Outside working hours.' using errcode = '22023';
  end if;
  if rule.break_start is not null
    and local_time < rule.break_end
    and local_time + make_interval(mins => slot_minutes) > rule.break_start
  then
    raise exception 'This time is unavailable.' using errcode = '23P01';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text || local_date::text, 0));
  if exists (
    select 1 from public.blocked_periods
    where owner_id = p_owner_id and start_at < slot_end and end_at > p_start_at
  ) then
    raise exception 'This time is blocked.' using errcode = '23P01';
  end if;
  if exists (
    select 1 from public.slot_requests
    where owner_id = p_owner_id
      and status in ('pending', 'approved')
      and start_at < slot_end
      and end_at > p_start_at
  ) then
    raise exception 'This time has just been requested.' using errcode = '23P01';
  end if;
  if exists (
    select 1 from public.appointments
    where owner_id = p_owner_id
      and status = 'confirmed'
      and start_at < slot_end
      and end_at > p_start_at
  ) then
    raise exception 'This time is no longer available.' using errcode = '23P01';
  end if;

  select count(*) into limit_count
  from public.slot_requests
  where owner_id = p_owner_id
    and status in ('pending', 'approved')
    and (start_at at time zone 'UTC')::date = local_date;
  if limit_count >= daily_limit then
    raise exception 'The daily request limit has been reached.' using errcode = '22023';
  end if;

  insert into public.slot_requests (
    owner_id,
    person_id,
    enquiry_id,
    start_at,
    end_at,
    visitor_timezone
  ) values (
    p_owner_id,
    p_person_id,
    p_enquiry_id,
    p_start_at,
    slot_end,
    p_visitor_timezone
  ) returning * into result;
  return result;
end;
$$;

revoke execute on function public.reserve_public_slot(uuid, uuid, uuid, timestamptz, text)
from public, anon, authenticated;
grant execute on function public.reserve_public_slot(uuid, uuid, uuid, timestamptz, text)
to service_role;

create or replace function public.approve_slot_request(
  p_request_id uuid,
  p_owner_note text default null
)
returns public.appointments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_row public.slot_requests;
  result public.appointments;
  recipient text;
begin
  select * into request_row
  from public.slot_requests
  where id = p_request_id
  for update;
  if request_row.id is null or request_row.status <> 'pending' then
    raise exception 'Pending slot request not found.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(request_row.owner_id::text || (request_row.start_at at time zone 'UTC')::date::text, 0)
  );
  update public.slot_requests
  set status = 'approved', owner_note = p_owner_note, decision_at = now()
  where id = p_request_id;

  insert into public.appointments (
    owner_id,
    slot_request_id,
    person_id,
    enquiry_id,
    start_at,
    end_at,
    visitor_timezone
  ) values (
    request_row.owner_id,
    request_row.id,
    request_row.person_id,
    request_row.enquiry_id,
    request_row.start_at,
    request_row.end_at,
    request_row.visitor_timezone
  ) returning * into result;

  insert into public.reminder_jobs (owner_id, appointment_id, due_at)
  values (result.owner_id, result.id, result.start_at - interval '1 day')
  on conflict (appointment_id, kind) do update
  set due_at = excluded.due_at, status = 'pending', updated_at = now();

  select person.email
  into recipient
  from public.people person
  where person.id = request_row.person_id
  limit 1;
  if recipient is not null then
    insert into public.email_outbox (
      owner_id,
      kind,
      recipient_email,
      subject,
      body_text,
      reply_to,
      idempotency_key
    ) values (
      result.owner_id,
      'appointment_confirmation',
      recipient,
      'Conversation slot confirmed',
      'Your conversation slot is confirmed for '
        || to_char(result.start_at at time zone 'UTC', 'DD Mon YYYY, HH12:MI AM')
        || ' UTC.',
      null,
      'appointment-confirmation-' || result.id
    ) on conflict (idempotency_key) do nothing;
  end if;
  return result;
end;
$$;

grant execute on function public.approve_slot_request(uuid, text) to authenticated;

create or replace function public.retry_email_job(p_job_id uuid)
returns public.email_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.email_outbox;
  actor_id uuid := (select auth.uid());
begin
  if not private.is_owner() then
    raise exception 'Owner access required.' using errcode = '42501';
  end if;
  select * into job
  from public.email_outbox row
  where row.id = p_job_id
    and row.owner_id = actor_id
    and row.kind in (
      'appointment_confirmation',
      'appointment_change',
      'appointment_reminder'
    )
  for update;
  if job.id is null then
    raise exception 'Email job not found.' using errcode = 'P0002';
  end if;
  if job.status <> 'failed' then
    raise exception 'Only failed email jobs can be retried.' using errcode = '22023';
  end if;

  update public.email_outbox
  set status = 'pending',
      attempts = 0,
      send_after = now(),
      last_error = null,
      updated_at = now()
  where id = p_job_id
  returning * into job;

  insert into public.audit_events (
    owner_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    actor_id,
    actor_id,
    'email_retry_queued',
    'email_outbox',
    p_job_id::text,
    jsonb_build_object('idempotencyKey', job.idempotency_key, 'kind', job.kind)
  );
  return job;
end;
$$;

revoke execute on function public.retry_email_job(uuid) from public, anon;
grant execute on function public.retry_email_job(uuid) to authenticated;
