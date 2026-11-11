begin;

-- A soft-deleted replacement row is intentionally invisible to non-Admin
-- SELECT policies. PostgreSQL therefore rejects an ordinary client UPDATE that
-- would hide its own result. This narrow RPC performs only the authorized delete
-- transition; it does not grant visibility of deleted rows or arbitrary SQL.
create function public.soft_delete_record(table_name text,record_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare domain_name text; row_deleted_at timestamptz; role_name text; matched_rows bigint;
begin
  role_name:=private.current_role_name();
  if role_name is null then raise exception 'Not authorized' using errcode='42501'; end if;
  domain_name:=case table_name
    when 'profiles' then 'admin'
    when 'master_lists' then 'masters'
    when 'heats' then 'furnace'
    when 'heat_materials' then 'furnace'
    when 'spectro_results' then 'furnace'
    when 'billet_entries' then 'production'
    when 'rod_plans' then 'production'
    when 'rod_production' then 'production'
    else null end;
  if domain_name is null or private.can_write_domain(domain_name) is distinct from true
    or (table_name='master_lists' and role_name not in ('admin','manager')) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  -- The identifier is selected exclusively from the case whitelist above;
  -- record identity is a parameter, never interpolated user SQL.
  execute format('select deleted_at from public.%I where id=$1 for update',table_name)
    into row_deleted_at using record_id;
  get diagnostics matched_rows=row_count;
  if matched_rows=0 or row_deleted_at is not null then return false; end if;
  execute format('update public.%I set deleted_at=statement_timestamp() where id=$1',table_name)
    using record_id;
  return true;
end $$;
revoke all on function public.soft_delete_record(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.soft_delete_record(text,uuid) to authenticated;

-- Revoke Supabase's permissive default grants before declaring the exact API.
revoke all on public.profiles,public.master_lists,public.heats,public.heat_materials,
  public.spectro_results,public.billet_entries,public.rod_plans,public.rod_production,
  public.app_config,public.audit_log,public.billet_stock,public.heat_charge_totals
  from public,anon,authenticated,service_role;

grant usage on schema public,private to authenticated,service_role;
grant usage on type public.factory_label to authenticated,service_role;
grant execute on function private.current_role_name(),private.can_read_row(timestamptz),
  private.can_write_domain(text) to authenticated;
grant execute on function public.get_billet_stock() to authenticated,service_role;
grant select on public.billet_stock,public.heat_charge_totals to authenticated,service_role;

-- The service role is server-only. Never put it in VITE_/EXPO_PUBLIC_ variables.
-- Audit inserts are performed exclusively by the trusted trigger owner.
grant select,insert,update,delete on public.profiles,public.master_lists,public.heats,
  public.heat_materials,public.spectro_results,public.billet_entries,public.rod_plans,
  public.rod_production,public.app_config to service_role;
grant select on public.audit_log to service_role;

do $$
declare t text; domain_name text;
begin
  foreach t in array array['profiles','master_lists','heats','heat_materials','spectro_results',
    'billet_entries','rod_plans','rod_production','app_config','audit_log'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('grant select on public.%I to authenticated',t);
    if t='audit_log' then
      execute format('create policy admin_audit_read on public.%I for select to authenticated using(private.current_role_name()=''admin'')',t);
    else
      execute format('create policy verified_active_read on public.%I for select to authenticated using(private.can_read_row(deleted_at))',t);
      execute format('grant insert,update on public.%I to authenticated',t);
      domain_name:=case when t in ('profiles','app_config') then 'admin'
        when t='master_lists' then 'masters'
        when t in ('heats','heat_materials','spectro_results') then 'furnace' else 'production' end;
      execute format('create policy domain_insert on public.%I for insert to authenticated with check(private.can_write_domain(%L) and deleted_at is null)',t,domain_name);
      if t='master_lists' then
        execute format('create policy domain_update on public.%I for update to authenticated using(private.current_role_name() in (''admin'',''manager'') and private.can_read_row(deleted_at)) with check(private.current_role_name() in (''admin'',''manager''))',t);
      else
        execute format('create policy domain_update on public.%I for update to authenticated using(private.can_write_domain(%L) and private.can_read_row(deleted_at)) with check(private.can_write_domain(%L))',t,domain_name,domain_name);
      end if;
    end if;
  end loop;
end $$;

-- All user deletion is an audited UPDATE to deleted_at. No authenticated role
-- receives DELETE/TRUNCATE, even Admin. Restore is additionally trigger-guarded.
-- The audit table has no write policies and no write grants.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;
revoke all on all tables in schema private from public,anon,authenticated,service_role;
commit;
