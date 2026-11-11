-- Phase 2: application schema. Run with the Supabase migration owner.
-- There are deliberately no credentials or auth.users samples in this migration.
begin;
create schema if not exists private;
revoke all on schema private from public;
create extension if not exists pgcrypto;

create domain public.factory_label as text
  check (value = btrim(value) and length(value) between 1 and 100
    and value !~ '[[:cntrl:]]');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name public.factory_label not null,
  role text not null default 'viewer' check (role in ('admin','manager','furnace_operator','production_operator','viewer')),
  is_active boolean not null default false,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.master_lists (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('company','grade','billet_size','rod_size','material')),
  name public.factory_label not null,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index master_lists_live_name on public.master_lists(type,lower(name)) where deleted_at is null;

create table public.heats (
  id uuid primary key default gen_random_uuid(), entry_date date not null check(isfinite(entry_date)),
  shift text not null check (shift in ('Day','Night')), furnace_no public.factory_label not null,
  heat_no public.factory_label not null check(length(heat_no)<=40),
  start_time time(0) not null, ready_time time(0) not null,
  grade_id uuid not null references public.master_lists(id),
  melting_minutes integer generated always as
    ((extract(epoch from (ready_time - start_time))::integer + 86400) % 86400 / 60) stored,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check(start_time <> ready_time),
  check(start_time < time '24:00:00' and ready_time < time '24:00:00')
);
-- Heat numbers are intentionally not unique: the brief requires an acknowledgment warning.
create index heats_heat_no_idx on public.heats(lower(heat_no));
create index heats_date_idx on public.heats(entry_date);
create table public.heat_materials (
  id uuid primary key default gen_random_uuid(), heat_id uuid not null references public.heats(id),
  material_id uuid not null references public.master_lists(id),
  weight_kg numeric(14,3) not null check(weight_kg>0 and weight_kg<=1000000),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index heat_materials_heat_idx on public.heat_materials(heat_id);
create table public.spectro_results (
  id uuid primary key default gen_random_uuid(), heat_id uuid not null references public.heats(id),
  cu numeric(8,5) not null check(cu between 0 and 100),
  zn numeric(8,5) not null check(zn between 0 and 100),
  pb numeric(8,5) not null check(pb between 0 and 100),
  fe numeric(8,5) not null check(fe between 0 and 100),
  sn numeric(8,5) not null check(sn between 0 and 100),
  auto_zn boolean not null default true, target_grade_id uuid not null references public.master_lists(id),
  status text not null check(status in ('Pass','Correction Done')),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check(cu+zn+pb+fe+sn<=100),
  check(not auto_zn or zn=100-cu-pb-fe-sn)
);
create unique index spectro_one_live_per_heat on public.spectro_results(heat_id) where deleted_at is null;

create table public.billet_entries (
  id uuid primary key default gen_random_uuid(), entry_date date not null check(isfinite(entry_date)),
  heat_id uuid references public.heats(id), custom_heat_no text,
  company_id uuid not null references public.master_lists(id), grade_id uuid not null references public.master_lists(id),
  size_id uuid not null references public.master_lists(id),
  billet_count integer not null check(billet_count between 1 and 1000000),
  total_weight_kg numeric(14,3) not null check(total_weight_kg>0 and total_weight_kg<=1000000),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check((heat_id is not null and custom_heat_no is null) or
    (heat_id is null and custom_heat_no is not null and custom_heat_no=btrim(custom_heat_no)
      and length(custom_heat_no) between 1 and 40 and custom_heat_no !~ '[[:cntrl:]]'))
);
create index billet_entries_date_idx on public.billet_entries(entry_date);
create index billet_entries_group_idx on public.billet_entries(company_id,grade_id,size_id);
create index billet_entries_heat_idx on public.billet_entries(heat_id);

create table public.rod_plans (
  id uuid primary key default gen_random_uuid(), entry_date date not null check(isfinite(entry_date)),
  rod_type text not null check(rod_type in ('Round','Hexa','Octa','Hollow')),
  length_mm numeric(14,3) not null check(length_mm>0 and length_mm<=100000),
  outer_mm numeric(14,3) not null check(outer_mm>0 and outer_mm<=100000),
  inner_mm numeric(14,3) not null default 0 check(inner_mm between 0 and 100000),
  dimension text not null check(dimension in ('Diameter','Radius','Across flats')),
  grade_id uuid not null references public.master_lists(id),
  planned_weight_kg numeric(14,3) not null check(planned_weight_kg>0 and planned_weight_kg<=1000000),
  company_id uuid not null references public.master_lists(id), order_name public.factory_label not null,
  priority text not null default 'Normal' check(priority in ('Normal','Urgent')),
  status text not null default 'Planned' check(status in ('Planned','In Production','Completed')),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check((rod_type in ('Hexa','Octa') and dimension='Across flats') or
    (rod_type in ('Round','Hollow') and dimension in ('Diameter','Radius'))),
  check((rod_type='Hollow' and inner_mm>0 and inner_mm < case when dimension='Radius' then outer_mm*2 else outer_mm end)
    or (rod_type<>'Hollow' and inner_mm=0))
);
create index rod_plans_date_idx on public.rod_plans(entry_date);
create index rod_plans_party_idx on public.rod_plans(company_id,grade_id);

create table public.rod_production (
  id uuid primary key default gen_random_uuid(), entry_date date not null check(isfinite(entry_date)),
  plan_id uuid references public.rod_plans(id),
  rod_type text not null check(rod_type in ('Round','Hexa','Octa','Hollow')),
  length_mm numeric(14,3) not null check(length_mm>0 and length_mm<=100000),
  outer_mm numeric(14,3) not null check(outer_mm>0 and outer_mm<=100000),
  inner_mm numeric(14,3) not null default 0 check(inner_mm between 0 and 100000),
  dimension text not null check(dimension in ('Diameter','Radius','Across flats')),
  company_id uuid not null references public.master_lists(id), grade_id uuid not null references public.master_lists(id),
  size_id uuid not null references public.master_lists(id),
  billets_used integer not null check(billets_used between 1 and 1000000),
  actual_weight_kg numeric(14,3) not null check(actual_weight_kg>0 and actual_weight_kg<=1000000),
  scrap_weight_kg numeric(14,3) not null default 0 check(scrap_weight_kg>=0 and scrap_weight_kg<=1000000),
  recovery_pct numeric generated always as (actual_weight_kg/(actual_weight_kg+scrap_weight_kg)*100) stored,
  check((rod_type in ('Hexa','Octa') and dimension='Across flats') or
    (rod_type in ('Round','Hollow') and dimension in ('Diameter','Radius'))),
  check((rod_type='Hollow' and inner_mm>0 and inner_mm < case when dimension='Radius' then outer_mm*2 else outer_mm end)
    or (rod_type<>'Hollow' and inner_mm=0)),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index rod_production_date_idx on public.rod_production(entry_date);
create index rod_production_group_idx on public.rod_production(company_id,grade_id,size_id);
create index rod_production_plan_idx on public.rod_production(plan_id);

create table public.app_config (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid
    check(id='00000000-0000-0000-0000-000000000001'::uuid),
  min_supported_app_version text not null default '0.3.0'
    check(min_supported_app_version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'),
  maintenance_mode boolean not null default false,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(), table_name text not null, record_id uuid not null,
  operation text not null check(operation in ('INSERT','UPDATE','DELETE','SOFT_DELETE','RESTORE')),
  actor_id uuid references public.profiles(id), occurred_at timestamptz not null default clock_timestamp(),
  old_value jsonb, new_value jsonb,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index audit_log_record_idx on public.audit_log(table_name,record_id,occurred_at);
create index audit_log_actor_idx on public.audit_log(actor_id,occurred_at);

-- Unexposed counters protect invariants using PostgreSQL's row-update locking.
-- No client grant is made to these tables. Counters are maintained by triggers only.
create table private.stock_balances (
  company_id uuid not null references public.master_lists(id),
  grade_id uuid not null references public.master_lists(id),
  size_id uuid not null references public.master_lists(id),
  available_billets bigint not null default 0 check(available_billets>=0),
  primary key(company_id,grade_id,size_id)
);
create table private.user_capacity (
  singleton boolean primary key default true check(singleton),
  active_users integer not null default 0 check(active_users between 0 and 20)
);
alter table private.stock_balances enable row level security;
alter table private.stock_balances force row level security;
alter table private.user_capacity enable row level security;
alter table private.user_capacity force row level security;
insert into private.user_capacity(singleton,active_users) values(true,0);
revoke all on all tables in schema private from public,anon,authenticated,service_role;
commit;
