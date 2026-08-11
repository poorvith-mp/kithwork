create table public.projects (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null, company_id uuid references public.companies(id) on delete set null,
  opportunity_id uuid unique references public.opportunities(id) on delete set null, title text not null, description text,
  status text not null default 'planned' check(status in('planned','active','blocked','on_hold','completed','cancelled')),
  start_date date, target_date date, completed_at timestamptz, progress smallint not null default 0 check(progress between 0 and 100),
  deleted_at timestamptz, purge_after timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index projects_owner_status_idx on public.projects(owner_id,status,updated_at desc) where deleted_at is null;
create index projects_person_idx on public.projects(person_id) where person_id is not null;
create index projects_company_idx on public.projects(company_id) where company_id is not null;

create table public.milestones (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade, title text not null, description text,
  status text not null default 'planned' check(status in('planned','active','completed','cancelled')), due_date date, position numeric(12,4) not null default 1000,
  completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index milestones_project_idx on public.milestones(project_id,position);

create table public.task_groups (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade, name text not null, position numeric(12,4) not null default 1000,
  created_at timestamptz not null default now(), unique(project_id,name)
);
create index task_groups_project_idx on public.task_groups(project_id,position);

create table public.tasks (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade, parent_task_id uuid references public.tasks(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null, task_group_id uuid references public.task_groups(id) on delete set null,
  title text not null, description text, status text not null default 'backlog' check(status in('backlog','todo','in_progress','blocked','done','cancelled')),
  priority text not null default 'normal' check(priority in('low','normal','high','urgent')), start_at timestamptz, due_at timestamptz,
  estimate_minutes integer check(estimate_minutes is null or estimate_minutes>=0), position numeric(12,4) not null default 1000,
  completed_at timestamptz, deleted_at timestamptz, purge_after timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tasks_owner_status_due_idx on public.tasks(owner_id,status,due_at) where deleted_at is null;
create index tasks_project_position_idx on public.tasks(project_id,status,position) where deleted_at is null;
create index tasks_parent_idx on public.tasks(parent_task_id) where parent_task_id is not null;
create index tasks_milestone_idx on public.tasks(milestone_id) where milestone_id is not null;
create index tasks_group_idx on public.tasks(task_group_id) where task_group_id is not null;

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade, depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(), check(task_id<>depends_on_task_id), unique(task_id,depends_on_task_id)
);
create index task_dependencies_task_idx on public.task_dependencies(task_id);
create index task_dependencies_parent_idx on public.task_dependencies(depends_on_task_id);

create table public.task_checklist_items (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade, label text not null, completed boolean not null default false,
  position numeric(12,4) not null default 1000, completed_at timestamptz, created_at timestamptz not null default now()
);
create index task_checklist_task_idx on public.task_checklist_items(task_id,position);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade, body text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments(task_id,created_at);

create table public.task_recurrences (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  source_task_id uuid not null unique references public.tasks(id) on delete cascade,
  frequency text not null check(frequency in('daily','weekly','monthly')), interval_count smallint not null default 1 check(interval_count between 1 and 52),
  next_run_at timestamptz not null, end_at timestamptz, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index task_recurrences_due_idx on public.task_recurrences(next_run_at) where active;

create table public.time_entries (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  description text, started_at timestamptz not null, ended_at timestamptz,
  duration_minutes integer generated always as (case when ended_at is null then null else greatest(0,floor(extract(epoch from(ended_at-started_at))/60)::integer) end) stored,
  source text not null default 'manual' check(source in('manual','timer')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(ended_at is null or ended_at>=started_at)
);
create unique index one_active_timer_per_owner on public.time_entries(owner_id) where ended_at is null and source='timer';
create index time_entries_project_idx on public.time_entries(project_id,started_at desc) where project_id is not null;
create index time_entries_task_idx on public.time_entries(task_id,started_at desc) where task_id is not null;

create or replace function private.prevent_dependency_cycle() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(with recursive chain(id) as(select new.depends_on_task_id union all select d.depends_on_task_id from public.task_dependencies d join chain c on d.task_id=c.id) select 1 from chain where id=new.task_id) then raise exception 'Task dependency would create a cycle'; end if;
  return new;
end $$;
create trigger task_dependency_cycle before insert or update on public.task_dependencies for each row execute function private.prevent_dependency_cycle();

do $$ declare table_name text; begin foreach table_name in array array['projects','milestones','task_groups','tasks','task_dependencies','task_checklist_items','task_comments','task_recurrences','time_entries'] loop
execute format('alter table public.%I enable row level security',table_name);
execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',table_name||'_owner',table_name);
execute format('create policy %I on public.%I as restrictive for all to authenticated using ((select auth.jwt()->>''aal'')=''aal2'') with check ((select auth.jwt()->>''aal'')=''aal2'')',table_name||'_mfa',table_name);
execute format('grant select,insert,update,delete on public.%I to authenticated',table_name); end loop; end $$;
do $$ declare table_name text; begin foreach table_name in array array['projects','milestones','tasks','task_comments','task_recurrences','time_entries'] loop execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()',table_name||'_updated_at',table_name); end loop; end $$;

create or replace function public.convert_opportunity_to_project(p_opportunity_id uuid,p_title text default null)
returns public.projects language plpgsql security invoker set search_path='' as $$ declare opp public.opportunities; result public.projects; begin
select * into opp from public.opportunities where id=p_opportunity_id for update; if opp.id is null then raise exception 'Opportunity not found'; end if; if opp.stage<>'won' then raise exception 'Only won opportunities can become projects'; end if;
insert into public.projects(owner_id,person_id,company_id,opportunity_id,title,status,start_date) values(opp.owner_id,opp.person_id,opp.company_id,opp.id,coalesce(nullif(btrim(p_title),''),opp.title),'planned',current_date) returning * into result; return result; end $$;

create or replace function public.start_task_timer(p_task_id uuid,p_description text default null)
returns public.time_entries language plpgsql security invoker set search_path='' as $$ declare task_row public.tasks; result public.time_entries; begin
select * into task_row from public.tasks where id=p_task_id; if task_row.id is null then raise exception 'Task not found'; end if;
insert into public.time_entries(owner_id,task_id,project_id,description,started_at,source) values(task_row.owner_id,task_row.id,task_row.project_id,p_description,now(),'timer') returning * into result; return result; end $$;
create or replace function public.stop_task_timer()
returns public.time_entries language plpgsql security invoker set search_path='' as $$ declare result public.time_entries; begin update public.time_entries set ended_at=now(),updated_at=now() where owner_id=(select auth.uid()) and ended_at is null and source='timer' returning * into result; return result; end $$;

grant execute on function public.convert_opportunity_to_project(uuid,text), public.start_task_timer(uuid,text), public.stop_task_timer() to authenticated;
