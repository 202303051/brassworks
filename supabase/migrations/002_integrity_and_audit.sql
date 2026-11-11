begin;

create function private.request_user_id() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare claim text := auth.jwt()->>'sub';
begin
  if claim is null or claim !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  return claim::uuid;
end $$;

create function private.is_maintenance_actor() returns boolean
language sql stable security definer set search_path='' as $$
  select current_setting('role',true)='service_role'
    or (current_setting('role',true) in ('none','postgres','supabase_admin')
      and session_user in ('postgres','supabase_admin'));
$$;

-- Do not trust role names supplied by a browser JWT; membership comes from profiles.
-- Admin data access additionally requires Supabase's signed MFA assurance claim.
create function private.current_role_name() returns text
language sql stable security definer set search_path='' as $$
  select p.role from public.profiles p join auth.users u on u.id=p.id
  where p.id=private.request_user_id() and p.is_active and p.deleted_at is null
    and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<now())
    and (p.role<>'admin' or auth.jwt()->>'aal'='aal2');
$$;
create function private.can_read_row(row_deleted_at timestamptz) returns boolean
language sql stable security definer set search_path='' as $$
  select private.current_role_name() is not null
    and (row_deleted_at is null or private.current_role_name()='admin');
$$;
create function private.can_write_domain(domain_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select case domain_name
    when 'furnace' then private.current_role_name() in ('admin','manager','furnace_operator')
    when 'production' then private.current_role_name() in ('admin','manager','production_operator')
    when 'masters' then private.current_role_name() in ('admin','manager','furnace_operator','production_operator')
    when 'admin' then private.current_role_name()='admin'
    else false end;
$$;

create function private.stamp_record() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid := private.request_user_id();
begin
  if tg_op='INSERT' then
    if new.deleted_at is not null and not private.is_maintenance_actor() then
      raise exception 'New rows cannot start deleted' using errcode='42501';
    end if;
    new.created_by:=actor; new.updated_by:=actor;
    new.created_at:=statement_timestamp(); new.updated_at:=statement_timestamp();
  else
    if new.id<>old.id then raise exception 'Record identity is immutable' using errcode='23514'; end if;
    if old.deleted_at is not null and not private.is_maintenance_actor()
      and private.current_role_name() is distinct from 'admin' then
      raise exception 'Only Admin may restore or change deleted records' using errcode='42501';
    end if;
    new.created_by:=old.created_by; new.created_at:=old.created_at;
    new.updated_by:=actor; new.updated_at:=statement_timestamp();
    if old.deleted_at is null and new.deleted_at is not null then new.deleted_at:=statement_timestamp(); end if;
  end if;
  return new;
end $$;

create function private.enforce_user_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_active integer:=0; new_active integer:=0;
begin
  if tg_op<>'INSERT' then old_active:=case when old.is_active and old.deleted_at is null then 1 else 0 end; end if;
  if tg_op<>'DELETE' then new_active:=case when new.is_active and new.deleted_at is null then 1 else 0 end; end if;
  if new_active<>old_active then
    update private.user_capacity set active_users=active_users+new_active-old_active
      where singleton and active_users+new_active-old_active between 0 and 20;
    if not found then raise exception 'At most 20 active users are allowed' using errcode='23514'; end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger profiles_capacity after insert or update or delete on public.profiles
  for each row execute function private.enforce_user_capacity();

create function private.require_master(master_id uuid, required_type text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.master_lists m where m.id=master_id and m.type=required_type
    and m.deleted_at is null for share;
  if not found then raise exception 'A live % master is required',required_type using errcode='23503'; end if;
end $$;
create function private.require_live_heat(heat_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.heats h where h.id=heat_id and h.deleted_at is null for share;
  if not found then raise exception 'A live heat is required' using errcode='23503'; end if;
end $$;

create function private.validate_relations() returns trigger
language plpgsql security definer set search_path='' as $$
declare linked_plan public.rod_plans%rowtype;
begin
  if new.deleted_at is not null then return new; end if;
  if tg_table_name='heats' then
    perform private.require_master(new.grade_id,'grade');
  elsif tg_table_name='heat_materials' then
    perform private.require_live_heat(new.heat_id);
    perform private.require_master(new.material_id,'material');
  elsif tg_table_name='spectro_results' then
    perform private.require_live_heat(new.heat_id);
    perform private.require_master(new.target_grade_id,'grade');
  elsif tg_table_name='billet_entries' then
    if new.heat_id is not null then perform private.require_live_heat(new.heat_id); end if;
    perform private.require_master(new.company_id,'company');
    perform private.require_master(new.grade_id,'grade');
    perform private.require_master(new.size_id,'billet_size');
  elsif tg_table_name='rod_plans' then
    perform private.require_master(new.company_id,'company');
    perform private.require_master(new.grade_id,'grade');
    if exists(select 1 from public.rod_production p where p.plan_id=new.id and p.deleted_at is null
      and (p.company_id<>new.company_id or p.grade_id<>new.grade_id)) then
      raise exception 'Plan company/grade must match linked production' using errcode='23514';
    end if;
  elsif tg_table_name='rod_production' then
    perform private.require_master(new.company_id,'company');
    perform private.require_master(new.grade_id,'grade');
    perform private.require_master(new.size_id,'billet_size');
    if new.plan_id is not null then
      select * into linked_plan from public.rod_plans p where p.id=new.plan_id and p.deleted_at is null for share;
      if not found then raise exception 'A live rod plan is required' using errcode='23503'; end if;
      if linked_plan.company_id<>new.company_id or linked_plan.grade_id<>new.grade_id then
        raise exception 'Production company/grade must match its plan' using errcode='23514';
      end if;
    end if;
  end if;
  return new;
end $$;

create function private.guard_parent_removal() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if tg_table_name='master_lists' then
      if new.type<>old.type then raise exception 'Master type is immutable' using errcode='23514'; end if;
    end if;
    if old.deleted_at is not null or new.deleted_at is null then return new; end if;
  end if;
  if tg_table_name='heats' and (
    exists(select 1 from public.billet_entries where heat_id=old.id and deleted_at is null) or
    exists(select 1 from public.heat_materials where heat_id=old.id and deleted_at is null) or
    exists(select 1 from public.spectro_results where heat_id=old.id and deleted_at is null)) then
    raise exception 'Heat has linked records; remove links first' using errcode='23503';
  elsif tg_table_name='rod_plans' and exists(
    select 1 from public.rod_production where plan_id=old.id and deleted_at is null) then
    raise exception 'Plan has linked production' using errcode='23503';
  elsif tg_table_name='master_lists' and (
    exists(select 1 from public.heats where grade_id=old.id and deleted_at is null) or
    exists(select 1 from public.heat_materials where material_id=old.id and deleted_at is null) or
    exists(select 1 from public.spectro_results where target_grade_id=old.id and deleted_at is null) or
    exists(select 1 from public.billet_entries where old.id in(company_id,grade_id,size_id) and deleted_at is null) or
    exists(select 1 from public.rod_plans where old.id in(company_id,grade_id) and deleted_at is null) or
    exists(select 1 from public.rod_production where old.id in(company_id,grade_id,size_id) and deleted_at is null)) then
    raise exception 'Master is in use by live records' using errcode='23503';
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;

-- A delta updates a private counter atomically. A SELECT SUM trigger plus an
-- advisory lock can still use a stale snapshot; this row UPDATE cannot overspend.
create function private.apply_stock_delta(company uuid,grade uuid,size uuid,delta bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
  if delta=0 then return; end if;
  insert into private.stock_balances(company_id,grade_id,size_id,available_billets)
    values(company,grade,size,0) on conflict do nothing;
  update private.stock_balances set available_billets=available_billets+delta
    where company_id=company and grade_id=grade and size_id=size and available_billets+delta>=0;
  if not found then raise exception 'Billet consumption exceeds available stock' using errcode='23514'; end if;
end $$;
create function private.maintain_stock() returns trigger
language plpgsql security definer set search_path='' as $$
declare oc uuid; og uuid; os uuid; nc uuid; ng uuid; ns uuid; od bigint:=0; nd bigint:=0;
begin
  if tg_op<>'INSERT' and old.deleted_at is null then
    oc:=old.company_id; og:=old.grade_id; os:=old.size_id;
    if tg_table_name='billet_entries' then od:=-old.billet_count; else od:=old.billets_used; end if;
  end if;
  if tg_op<>'DELETE' and new.deleted_at is null then
    nc:=new.company_id; ng:=new.grade_id; ns:=new.size_id;
    if tg_table_name='billet_entries' then nd:=new.billet_count; else nd:=-new.billets_used; end if;
  end if;
  if oc=nc and og=ng and os=ns then
    perform private.apply_stock_delta(nc,ng,ns,od+nd);
  elsif oc is not null and nc is not null then
    -- Order the two groups consistently to reduce group-move deadlocks.
    if (oc,og,os)<(nc,ng,ns) then
      perform private.apply_stock_delta(oc,og,os,od); perform private.apply_stock_delta(nc,ng,ns,nd);
    else
      perform private.apply_stock_delta(nc,ng,ns,nd); perform private.apply_stock_delta(oc,og,os,od);
    end if;
  else
    if oc is not null then perform private.apply_stock_delta(oc,og,os,od); end if;
    if nc is not null then perform private.apply_stock_delta(nc,ng,ns,nd); end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;

create function private.write_audit() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.request_user_id(); op text:=tg_op;
  before_value jsonb; after_value jsonb; row_id uuid;
begin
  if tg_op<>'INSERT' then before_value:=to_jsonb(old); row_id:=old.id; end if;
  if tg_op<>'DELETE' then after_value:=to_jsonb(new); row_id:=new.id; end if;
  if tg_op='UPDATE' and old.deleted_at is null and new.deleted_at is not null then op:='SOFT_DELETE'; end if;
  if tg_op='UPDATE' and old.deleted_at is not null and new.deleted_at is null then op:='RESTORE'; end if;
  insert into public.audit_log(table_name,record_id,operation,actor_id,old_value,new_value,
    created_by,updated_by) values(tg_table_name,row_id,op,actor,before_value,after_value,actor,actor);
  if tg_op='DELETE' then return old; end if; return new;
end $$;
create function private.deny_audit_mutation() returns trigger
language plpgsql security definer set search_path='' as $$
begin raise exception 'Audit log is append-only' using errcode='42501'; end $$;
create trigger audit_immutable before update or delete on public.audit_log
  for each row execute function private.deny_audit_mutation();

-- Protect audit identity and counters from TRUNCATE too. Authenticated clients
-- never receive TRUNCATE privileges; the trigger also prevents accidental owner use.
create function private.deny_truncate() returns trigger
language plpgsql security definer set search_path='' as $$
begin raise exception 'TRUNCATE bypasses factory integrity; use transactional row operations' using errcode='42501'; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','master_lists','heats','heat_materials','spectro_results',
    'billet_entries','rod_plans','rod_production','app_config'] loop
    execute format('create trigger a_stamp before insert or update on public.%I for each row execute function private.stamp_record()',t);
    execute format('create trigger z_audit after insert or update or delete on public.%I for each row execute function private.write_audit()',t);
    execute format('create trigger no_truncate before truncate on public.%I for each statement execute function private.deny_truncate()',t);
  end loop;
  foreach t in array array['heats','heat_materials','spectro_results','billet_entries','rod_plans','rod_production'] loop
    execute format('create trigger b_relations before insert or update on public.%I for each row execute function private.validate_relations()',t);
  end loop;
  foreach t in array array['heats','rod_plans','master_lists'] loop
    execute format('create trigger c_parent_guard before update or delete on public.%I for each row execute function private.guard_parent_removal()',t);
  end loop;
  foreach t in array array['billet_entries','rod_production'] loop
    execute format('create trigger y_stock after insert or update or delete on public.%I for each row execute function private.maintain_stock()',t);
  end loop;
end $$;
create trigger no_truncate before truncate on public.audit_log
  for each statement execute function private.deny_truncate();
create trigger no_truncate before truncate on private.stock_balances
  for each statement execute function private.deny_truncate();
create trigger no_truncate before truncate on private.user_capacity
  for each statement execute function private.deny_truncate();

-- The caller's RLS applies to every source table; no owner-bypass stock view.
create view public.billet_stock with(security_invoker=true) as
with receipts as (
  select company_id,grade_id,size_id,sum(billet_count)::bigint received_billets,
    sum(billet_count) filter(where entry_date=(now() at time zone 'Asia/Kolkata')::date)::bigint today_received_billets
  from public.billet_entries where deleted_at is null group by company_id,grade_id,size_id
), consumption as (
  select company_id,grade_id,size_id,sum(billets_used)::bigint consumed_billets
  from public.rod_production where deleted_at is null group by company_id,grade_id,size_id
)
select r.company_id,r.grade_id,r.size_id,r.received_billets,
  coalesce(r.today_received_billets,0)::bigint today_received_billets,
  coalesce(c.consumed_billets,0)::bigint consumed_billets,
  (r.received_billets-coalesce(c.consumed_billets,0))::bigint available_billets
from receipts r left join consumption c using(company_id,grade_id,size_id);
create function public.get_billet_stock() returns setof public.billet_stock
language sql stable security invoker set search_path='' as $$ select * from public.billet_stock; $$;

create view public.heat_charge_totals with(security_invoker=true) as
select h.id heat_id,coalesce(sum(m.weight_kg),0)::numeric total_charge_kg
from public.heats h left join public.heat_materials m on m.heat_id=h.id and m.deleted_at is null
where h.deleted_at is null group by h.id;

-- Functions default to PUBLIC execute unless explicitly revoked.
revoke all on all functions in schema private from public,anon,authenticated,service_role;
revoke all on function public.get_billet_stock() from public,anon;
commit;
