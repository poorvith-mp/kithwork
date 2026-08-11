begin;

select plan(11);

select has_table('public', 'app_profiles', 'profiles table exists');
select has_table('public', 'record_assignments', 'assignment table exists');
select has_function(
  'public',
  'current_access_snapshot',
  array[]::text[],
  'access snapshot exists'
);
select policies_are(
  'public',
  'app_profiles',
  array[
    'app_profiles_self_read',
    'app_profiles_owner_manage',
    'app_profiles_mfa'
  ]
);
select policies_are(
  'public',
  'record_assignments',
  array[
    'record_assignments_authorized_read',
    'record_assignments_owner_manage',
    'record_assignments_mfa'
  ]
);
select function_returns(
  'private',
  'can_access_record',
  array['text', 'uuid'],
  'boolean'
);
select has_function(
  'public',
  'replace_collaborator_access',
  array['uuid', 'jsonb', 'jsonb'],
  'atomic access replacement exists'
);
select has_function(
  'public',
  'set_collaborator_state',
  array['uuid', 'collaborator_state'],
  'account state transition exists'
);
select has_function(
  'public',
  'touch_app_session',
  array['jsonb', 'text'],
  'session registration exists'
);
select has_function(
  'public',
  'revoke_app_session',
  array['uuid'],
  'single session revocation exists'
);
select has_function(
  'public',
  'revoke_other_app_sessions',
  array[]::text[],
  'other-session revocation exists'
);

select * from finish();
rollback;
