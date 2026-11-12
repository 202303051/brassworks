begin;

-- The sole pre-MFA API: disclose only the caller's own verified, active profile.
-- Never use this RPC to authorize Admin operations; those still require aal2 RLS.
create function public.get_my_access() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',p.id,'full_name',p.full_name,'role',p.role)
  from public.profiles p join auth.users u on u.id=p.id
  where p.id=private.request_user_id() and p.is_active and p.deleted_at is null
    and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<now());
$$;
revoke all on function public.get_my_access() from public,anon,authenticated,service_role;
grant execute on function public.get_my_access() to authenticated;

create function private.guard_account_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if private.is_maintenance_actor() then return new; end if;
  if new.id=private.request_user_id() and
    (new.role is distinct from old.role or new.is_active is distinct from old.is_active
      or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'Ask another administrator to change your own access' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function private.guard_account_change() from public,anon,authenticated,service_role;
create trigger account_change_guard before update on public.profiles
  for each row execute function private.guard_account_change();

comment on function public.get_my_access() is 'Own verified active profile for the sign-in/MFA gate; no general profile listing or Admin authorization.';
commit;
