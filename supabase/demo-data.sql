-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Fictional records for an isolated Kithwork demo project only.
-- Run after creating the demo owner. The script refuses a non-empty workspace.

do $$
declare
  workspace_owner uuid;
  person_id uuid;
  company_id uuid;
  opportunity_id uuid;
  project_id uuid;
begin
  select owner_id into workspace_owner
  from public.owner_settings
  order by created_at
  limit 1;

  if workspace_owner is null then
    raise exception 'Create the demo owner before loading fictional data.';
  end if;

  if exists (select 1 from public.people)
    or exists (select 1 from public.companies)
    or exists (select 1 from public.projects)
  then
    raise exception 'Demo data can only be loaded into an empty workspace.';
  end if;

  insert into public.companies (
    owner_id,
    name,
    website,
    email,
    industry,
    status,
    notes
  ) values (
    workspace_owner,
    'Northstar Bicycle Co.',
    'https://northstar.example',
    'hello@northstar.example',
    'Retail',
    'active_client',
    'Fictional company used in the Kithwork demo.'
  ) returning id into company_id;

  insert into public.people (
    owner_id,
    first_name,
    last_name,
    email,
    relationship_status,
    source,
    notes
  ) values (
    workspace_owner,
    'Maya',
    'Chen',
    'maya.chen@example.invalid',
    'active_client',
    'demo',
    'Fictional relationship used in the Kithwork demo.'
  ) returning id into person_id;

  insert into public.company_people (
    owner_id,
    company_id,
    person_id,
    job_title,
    is_primary
  ) values (
    workspace_owner,
    company_id,
    person_id,
    'Operations Lead',
    true
  );

  insert into public.opportunities (
    owner_id,
    person_id,
    company_id,
    title,
    stage,
    expected_value,
    probability,
    next_action,
    next_action_due_at,
    notes
  ) values (
    workspace_owner,
    person_id,
    company_id,
    'Store launch workspace',
    'won',
    4200,
    100,
    'Review the launch checklist',
    now() + interval '2 days',
    'Fictional opportunity used in the Kithwork demo.'
  ) returning id into opportunity_id;

  insert into public.projects (
    owner_id,
    person_id,
    company_id,
    opportunity_id,
    title,
    description,
    status,
    start_date,
    target_date,
    progress
  ) values (
    workspace_owner,
    person_id,
    company_id,
    opportunity_id,
    'Northstar store launch',
    'A fictional project showing delivery and follow-through.',
    'active',
    current_date - 7,
    current_date + 21,
    35
  ) returning id into project_id;

  insert into public.tasks (
    owner_id,
    project_id,
    title,
    status,
    priority,
    due_at,
    position
  ) values
    (workspace_owner, project_id, 'Confirm launch inventory', 'done', 'high', now() - interval '1 day', 1000),
    (workspace_owner, project_id, 'Review storefront copy', 'in_progress', 'normal', now() + interval '2 days', 2000),
    (workspace_owner, project_id, 'Run opening-day checklist', 'todo', 'high', now() + interval '7 days', 3000);
end;
$$;
-- SPDX-License-Identifier: AGPL-3.0-or-later
