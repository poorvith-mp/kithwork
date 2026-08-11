create or replace function private.record_audit_event()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  row_value jsonb := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  row_owner uuid := (row_value->>'owner_id')::uuid;
  row_id text := coalesce(row_value->>'id',row_value->>'owner_id');
begin
  insert into public.audit_events(owner_id,action,entity_type,entity_id,metadata)
  values(row_owner,lower(tg_op),tg_table_name,row_id,jsonb_build_object('source',current_user,'changedAt',now()));
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke execute on function private.record_audit_event() from public,anon,authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['owner_settings','people','companies','enquiries','opportunities','projects','tasks','blocked_periods','slot_requests','appointments','conversations','messages','files','campaigns']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.record_audit_event()',table_name||'_audit',table_name);
  end loop;
end $$;
