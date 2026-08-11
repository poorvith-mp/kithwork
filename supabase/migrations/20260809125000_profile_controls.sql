insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-photos',
  'profile-photos',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy profile_photos_self_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and private.is_aal2()
  and (private.is_owner() or private.is_active_collaborator())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_photos_self_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and private.is_aal2()
  and (private.is_owner() or private.is_active_collaborator())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_photos_self_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and private.is_aal2()
  and (private.is_owner() or private.is_active_collaborator())
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-photos'
  and private.is_aal2()
  and (private.is_owner() or private.is_active_collaborator())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_photos_self_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and private.is_aal2()
  and (private.is_owner() or private.is_active_collaborator())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.update_my_profile(
  p_full_name text,
  p_phone text,
  p_role_title text,
  p_timezone text,
  p_bio text,
  p_photo_path text,
  p_notification_preferences jsonb
)
returns public.app_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.app_profiles;
  result public.app_profiles;
  owner_id uuid;
begin
  if not private.is_aal2() then
    raise exception 'Authenticator verification is required.' using errcode = '42501';
  end if;

  select * into current_profile
  from public.app_profiles profile
  where profile.user_id = (select auth.uid())
  for update;

  if current_profile.user_id is null or current_profile.account_state <> 'active' then
    raise exception 'This account is unavailable.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_full_name, ''))) not between 2 and 120 then
    raise exception 'Full name must contain between 2 and 120 characters.' using errcode = '22023';
  end if;
  if p_phone is not null and length(p_phone) > 40 then
    raise exception 'Phone number is too long.' using errcode = '22023';
  end if;
  if p_role_title is not null and length(p_role_title) > 120 then
    raise exception 'Role title is too long.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_timezone, ''))) not between 1 and 80 then
    raise exception 'Timezone is invalid.' using errcode = '22023';
  end if;
  if p_bio is not null and length(p_bio) > 1000 then
    raise exception 'Bio is too long.' using errcode = '22023';
  end if;
  if p_photo_path is not null and (
    p_photo_path not like ((select auth.uid())::text || '/%')
    or p_photo_path like '%..%'
    or p_photo_path !~ '\.(jpg|png|webp)$'
  ) then
    raise exception 'Profile photo path is invalid.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_notification_preferences) <> 'object'
    or jsonb_typeof(p_notification_preferences->'email') <> 'boolean'
    or jsonb_typeof(p_notification_preferences->'inApp') <> 'boolean'
    or p_notification_preferences - array['email', 'inApp'] <> '{}'::jsonb
  then
    raise exception 'Notification preferences are invalid.' using errcode = '22023';
  end if;

  update public.app_profiles
  set full_name = btrim(p_full_name),
      phone = nullif(btrim(p_phone), ''),
      role_title = nullif(btrim(p_role_title), ''),
      timezone = btrim(p_timezone),
      bio = nullif(btrim(p_bio), ''),
      photo_path = p_photo_path,
      notification_preferences = p_notification_preferences
  where user_id = (select auth.uid())
  returning * into result;

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
    'profile_updated',
    'profile',
    (select auth.uid())::text,
    jsonb_build_object(
      'photoChanged', current_profile.photo_path is distinct from p_photo_path,
      'timezoneChanged', current_profile.timezone is distinct from btrim(p_timezone)
    )
  );

  return result;
end;
$$;

revoke execute on function public.update_my_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon;

grant execute on function public.update_my_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;

create or replace function private.handle_owner_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(new.email));
  existing_profile public.app_profiles;
  invite public.collaborator_invites;
begin
  if new.email is null then
    raise exception 'An email address is required.' using errcode = '23514';
  end if;

  select * into existing_profile
  from public.app_profiles profile
  where profile.user_id = new.id;

  if existing_profile.user_id is not null then
    update public.app_profiles
    set email = normalized_email
    where user_id = new.id;

    if existing_profile.is_owner then
      update public.owner_settings
      set email = normalized_email
      where owner_id = new.id;
    end if;
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
