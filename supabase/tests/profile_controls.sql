begin;

do $$
declare
  owner_id uuid;
  profile public.app_profiles;
  rejected boolean := false;
begin
  select settings.owner_id into owner_id
  from public.owner_settings settings
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

  select * into profile
  from public.update_my_profile(
    'Profile Contract',
    null,
    'Owner',
    'Asia/Kolkata',
    'Rolled-back profile contract check.',
    owner_id::text || '/avatar-contract.webp',
    '{"email":true,"inApp":false}'::jsonb
  );

  if profile.full_name <> 'Profile Contract'
    or profile.photo_path <> owner_id::text || '/avatar-contract.webp'
  then
    raise exception 'AAL2 profile update contract failed.';
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', owner_id, 'aal', 'aal1')::text,
    true
  );

  begin
    perform public.update_my_profile(
      'Rejected Profile',
      null,
      null,
      'Asia/Kolkata',
      null,
      null,
      '{"email":true,"inApp":true}'::jsonb
    );
  exception when insufficient_privilege then
    rejected := true;
  end;

  if not rejected then
    raise exception 'AAL1 profile update was not rejected.';
  end if;
end;
$$;

rollback;
