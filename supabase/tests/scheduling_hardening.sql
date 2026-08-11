begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

select is(
  (select conversation_minutes from public.owner_settings limit 1),
  30::smallint,
  'slot length is 30 minutes'
);
select has_function(
  'public',
  'reserve_public_slot',
  array['uuid', 'uuid', 'uuid', 'timestamp with time zone', 'text'],
  'atomic slot reservation exists'
);
select has_index(
  'public',
  'email_outbox',
  'email_outbox_idempotency_key_key',
  'email jobs keep a unique logical message identity'
);
select has_function(
  'public',
  'retry_email_job',
  array['uuid'],
  'failed email retry RPC exists'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.slot_requests'::regclass
      and conname = 'slot_requests_no_active_overlap'
  ),
  'active slot requests cannot overlap'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_no_confirmed_overlap'
  ),
  'confirmed appointments cannot overlap'
);

do $pgtap$
declare
  diagnostic text;
begin
  for diagnostic in select * from finish()
  loop
    raise exception 'pgTAP contract failure: %', diagnostic;
  end loop;
end;
$pgtap$;

do $$
<<scheduling_contract>>
declare
  owner_id uuid;
  person_id uuid;
  enquiry_id uuid;
  job_id uuid;
  confirmation_job_id uuid;
  test_start timestamptz;
  reserved public.slot_requests;
  appointment public.appointments;
  retried public.email_outbox;
  rejected boolean := false;
begin
  select settings.owner_id into owner_id
  from public.owner_settings settings
  order by settings.created_at
  limit 1;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', owner_id,
      'aal', 'aal2',
      'session_id', gen_random_uuid()
    )::text,
    true
  );

  insert into public.people (owner_id, first_name, email, source)
  values (owner_id, 'Scheduling Contract', 'scheduling-contract@example.invalid', 'manual')
  returning id into person_id;

  insert into public.enquiries (owner_id, person_id, category, message, source)
  values (owner_id, person_id, 'manual', 'Rolled-back scheduling contract.', 'manual')
  returning id into enquiry_id;

  test_start := (
    date_trunc('week', now() at time zone 'UTC')
      + interval '14 days 9 hours'
  ) at time zone 'UTC';
  update public.availability_rules rule
  set enabled = true,
      start_time = '09:00',
      end_time = '18:00',
      break_start = '13:00',
      break_end = '14:00'
  where rule.owner_id = scheduling_contract.owner_id and rule.weekday = 1;

  reserved := public.reserve_public_slot(
    scheduling_contract.owner_id,
    person_id,
    enquiry_id,
    test_start,
    'UTC'
  );
  if reserved.end_at - reserved.start_at <> interval '30 minutes' then
    raise exception 'Reserved slot did not use the configured 30-minute duration.';
  end if;

  appointment := public.approve_slot_request(reserved.id, 'Contract approval');
  select id into confirmation_job_id
  from public.email_outbox
  where idempotency_key = 'appointment-confirmation-' || appointment.id;
  if appointment.status <> 'confirmed' or confirmation_job_id is null then
    raise exception 'Appointment approval did not atomically queue confirmation email.';
  end if;

  insert into public.email_outbox (
    owner_id,
    kind,
    recipient_email,
    subject,
    body_text,
    status,
    attempts,
    last_error,
    idempotency_key
  ) values (
    owner_id,
    'appointment_confirmation',
    'scheduling-contract@example.invalid',
    'Contract',
    'Contract',
    'failed',
    3,
    'Contract failure',
    'appointment-confirmation-contract'
  ) returning id into job_id;

  retried := public.retry_email_job(job_id);
  if retried.id <> job_id
    or retried.status <> 'pending'
    or retried.attempts <> 0
    or retried.idempotency_key <> 'appointment-confirmation-contract'
  then
    raise exception 'Email retry did not preserve logical message identity.';
  end if;

  insert into public.slot_requests (
    owner_id, person_id, enquiry_id, start_at, end_at, visitor_timezone
  ) values (
    owner_id, person_id, enquiry_id,
    '2099-01-05 04:30:00+00', '2099-01-05 05:00:00+00', 'UTC'
  );
  begin
    insert into public.slot_requests (
      owner_id, person_id, enquiry_id, start_at, end_at, visitor_timezone
    ) values (
      owner_id, person_id, enquiry_id,
      '2099-01-05 04:45:00+00', '2099-01-05 05:15:00+00', 'UTC'
    );
  exception when exclusion_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Overlapping active slot request was accepted.';
  end if;

  rejected := false;
  insert into public.appointments (
    owner_id, person_id, enquiry_id, start_at, end_at, visitor_timezone
  ) values (
    owner_id, person_id, enquiry_id,
    '2099-01-06 04:30:00+00', '2099-01-06 05:00:00+00', 'UTC'
  );
  begin
    insert into public.appointments (
      owner_id, person_id, enquiry_id, start_at, end_at, visitor_timezone
    ) values (
      owner_id, person_id, enquiry_id,
      '2099-01-06 04:45:00+00', '2099-01-06 05:15:00+00', 'UTC'
    );
  exception when exclusion_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Overlapping confirmed appointment was accepted.';
  end if;
end;
$$;

rollback;
