-- Behavioral checks run against a disposable local PostgreSQL database.
-- They deliberately use the API roles; all fixtures are rolled back.
BEGIN;
SET LOCAL client_min_messages = notice;
SELECT set_config('brassworks_test.pass_count', '0', true);

CREATE FUNCTION pg_temp.assert_ok(label text, condition boolean) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL: %', label;
  END IF;
  PERFORM set_config('brassworks_test.pass_count',
    (current_setting('brassworks_test.pass_count')::int + 1)::text, true);
  RAISE NOTICE 'PASS: %', label;
END;
$$;
CREATE FUNCTION pg_temp.expect_error(label text, statement text, states text[] DEFAULT ARRAY['42501','23514','23503','23505','P0001']) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE actual_state text; rejected boolean := false;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE;
    IF NOT actual_state = ANY(states) THEN
      RAISE EXCEPTION 'FAIL: %: unexpected SQLSTATE % (%); statement: %', label, actual_state, SQLERRM, statement;
    END IF;
    rejected := true;
  END;
  PERFORM pg_temp.assert_ok(label, rejected);
END;
$$;
CREATE FUNCTION pg_temp.actor(user_id uuid, assurance text DEFAULT 'aal2') RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', user_id::text, 'aal', assurance)::text, true);
END;
$$;

CREATE FUNCTION pg_temp.copy_insert_statement(entity text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE columns_sql text; values_sql text;
BEGIN
  SELECT string_agg(quote_ident(a.attname), ',' ORDER BY a.attnum),
    string_agg(CASE WHEN a.attname='id' THEN 'gen_random_uuid()' ELSE quote_ident(a.attname) END, ',' ORDER BY a.attnum)
    INTO columns_sql, values_sql
    FROM pg_attribute a
    WHERE a.attrelid=('public.'||entity)::regclass AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated='';
  RETURN format('INSERT INTO public.%I (%s) SELECT %s FROM public.%I LIMIT 1', entity, columns_sql, values_sql, entity);
END;
$$;

-- Test-only UUID fixtures, not real factory or user information.
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
('11000000-0000-0000-0000-000000000001','admin@example.test',now()),
('11000000-0000-0000-0000-000000000002','manager@example.test',now()),
('11000000-0000-0000-0000-000000000003','furnace@example.test',now()),
('11000000-0000-0000-0000-000000000004','production@example.test',now()),
('11000000-0000-0000-0000-000000000005','viewer@example.test',now()),
('11000000-0000-0000-0000-000000000006','inactive@example.test',now()),
('11000000-0000-0000-0000-000000000007','unverified@example.test',NULL);
INSERT INTO public.profiles(id,full_name,role,is_active) VALUES
('11000000-0000-0000-0000-000000000001','Test Admin','admin',true),
('11000000-0000-0000-0000-000000000002','Test Manager','manager',true),
('11000000-0000-0000-0000-000000000003','Test Furnace','furnace_operator',true),
('11000000-0000-0000-0000-000000000004','Test Production','production_operator',true),
('11000000-0000-0000-0000-000000000005','Test Viewer','viewer',true),
('11000000-0000-0000-0000-000000000006','Test Inactive','manager',false),
('11000000-0000-0000-0000-000000000007','Test Unverified','manager',true);
INSERT INTO public.master_lists(id,type,name) VALUES
('21000000-0000-0000-0000-000000000001','company','Test Brass Company'),
('21000000-0000-0000-0000-000000000002','grade','Test CZ121'),
('21000000-0000-0000-0000-000000000003','billet_size','Test 100 x 600 mm'),
('21000000-0000-0000-0000-000000000004','material','Test Copper Scrap'),
('21000000-0000-0000-0000-000000000005','company','Test Other Company'),
('21000000-0000-0000-0000-000000000006','grade','Test Naval Brass');

-- Structural guarantees must apply to every requested table.
DO $$
DECLARE entity_name text; required_column text;
BEGIN
  FOREACH entity_name IN ARRAY ARRAY['profiles','heats','heat_materials','spectro_results','billet_entries','rod_plans','rod_production','master_lists','audit_log','app_config'] LOOP
    PERFORM pg_temp.assert_ok(entity_name || ': RLS enabled',
      (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || entity_name)::regclass));
    FOREACH required_column IN ARRAY ARRAY['id','created_by','created_at','updated_by','updated_at','deleted_at'] LOOP
      PERFORM pg_temp.assert_ok(entity_name || ': column ' || required_column,
        EXISTS(SELECT FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=entity_name AND c.column_name=required_column));
    END LOOP;
    PERFORM pg_temp.assert_ok(entity_name || ': anonymous lacks writes',
      NOT has_table_privilege('anon','public.' || entity_name,'INSERT,UPDATE,DELETE'));
  END LOOP;
END;
$$;

SELECT pg_temp.assert_ok('private stock counter has forced RLS',
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='private.stock_balances'::regclass));
SELECT pg_temp.assert_ok('private capacity counter has forced RLS',
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='private.user_capacity'::regclass));

-- Create live records as a real verified manager, not as database owner.
SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000002');
INSERT INTO public.heats(id,entry_date,shift,furnace_no,heat_no,start_time,ready_time,grade_id)
VALUES('31000000-0000-0000-0000-000000000001',DATE '2026-11-10','Day','F1','TEST-HEAT-001','22:00','01:00','21000000-0000-0000-0000-000000000002');
INSERT INTO public.heat_materials(id,heat_id,material_id,weight_kg)
VALUES('32000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000004',100);
INSERT INTO public.spectro_results(id,heat_id,cu,zn,pb,fe,sn,auto_zn,target_grade_id,status)
VALUES('33000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001',60,37,2,0.5,0.5,false,'21000000-0000-0000-0000-000000000002','Pass');
INSERT INTO public.billet_entries(id,entry_date,heat_id,company_id,grade_id,size_id,billet_count,total_weight_kg)
VALUES('41000000-0000-0000-0000-000000000001',DATE '2026-11-10','31000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000003',10,100);
INSERT INTO public.rod_plans(id,entry_date,rod_type,length_mm,outer_mm,inner_mm,dimension,grade_id,planned_weight_kg,company_id,order_name,priority,status)
VALUES('51000000-0000-0000-0000-000000000001',DATE '2026-11-10','Round',3000,20,0,'Diameter','21000000-0000-0000-0000-000000000002',80,'21000000-0000-0000-0000-000000000001','Test Order','Normal','Planned');
INSERT INTO public.rod_production(id,entry_date,plan_id,company_id,grade_id,size_id,billets_used,actual_weight_kg,scrap_weight_kg,rod_type,length_mm,outer_mm,dimension)
VALUES('61000000-0000-0000-0000-000000000001',DATE '2026-11-10','51000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000003',4,38,2,'Round',3000,20,'Diameter');
SELECT pg_temp.assert_ok('manager can create all production entities',
  (SELECT count(*)=1 FROM public.rod_production WHERE id='61000000-0000-0000-0000-000000000001'));
SELECT pg_temp.assert_ok('actor metadata is server assigned',
  (SELECT created_by='11000000-0000-0000-0000-000000000002' FROM public.heats WHERE id='31000000-0000-0000-0000-000000000001'));
SELECT pg_temp.assert_ok('overnight melting duration is computed server-side',
 (SELECT melting_minutes=180 FROM public.heats WHERE id='31000000-0000-0000-0000-000000000001'));
SELECT pg_temp.assert_ok('recovery is computed server-side',
 (SELECT recovery_pct=95 FROM public.rod_production WHERE id='61000000-0000-0000-0000-000000000001'));
SELECT pg_temp.expect_error('zero material weight is rejected', $$UPDATE public.heat_materials SET weight_kg=0 WHERE id='32000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('negative material weight is rejected', $$UPDATE public.heat_materials SET weight_kg=-1 WHERE id='32000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('oversized material weight is rejected', $$UPDATE public.heat_materials SET weight_kg=1000001 WHERE id='32000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('spectro total above 100 is rejected', $$UPDATE public.spectro_results SET cu=100 WHERE id='33000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('spectro negative percentage is rejected', $$UPDATE public.spectro_results SET pb=-1 WHERE id='33000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('automatic zinc requires the actual balance', $$UPDATE public.spectro_results SET auto_zn=true,zn=36 WHERE id='33000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('equal melt start and ready is rejected', $$UPDATE public.heats SET ready_time=start_time WHERE id='31000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('empty heat label is rejected', $$UPDATE public.heats SET heat_no='' WHERE id='31000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('infinite dates are rejected', $$UPDATE public.heats SET entry_date='infinity' WHERE id='31000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('invalid calendar date is rejected', $$UPDATE public.heats SET entry_date='2026-02-30' WHERE id='31000000-0000-0000-0000-000000000001'$$,ARRAY['22008']);
SELECT pg_temp.expect_error('invalid hollow inner dimension is rejected', $$UPDATE public.rod_plans SET rod_type='Hollow',inner_mm=20 WHERE id='51000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('shape and dimension must match', $$UPDATE public.rod_plans SET rod_type='Hexa' WHERE id='51000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('zero actual production is rejected', $$UPDATE public.rod_production SET actual_weight_kg=0 WHERE id='61000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('negative scrap is rejected', $$UPDATE public.rod_production SET scrap_weight_kg=-1 WHERE id='61000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('missing master FK is rejected', $$UPDATE public.heats SET grade_id='ffffffff-ffff-ffff-ffff-ffffffffffff' WHERE id='31000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error('master types cannot be substituted', $$UPDATE public.heats SET grade_id='21000000-0000-0000-0000-000000000001' WHERE id='31000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error('production must match linked plan company', $$UPDATE public.rod_production SET company_id='21000000-0000-0000-0000-000000000005' WHERE id='61000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error('production must match linked plan grade', $$UPDATE public.rod_production SET grade_id='21000000-0000-0000-0000-000000000006' WHERE id='61000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error('production cannot overconsume remaining stock', $$UPDATE public.rod_production SET billets_used=11 WHERE id='61000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error('receipt cannot be reduced below consumed stock', $$UPDATE public.billet_entries SET billet_count=3 WHERE id='41000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error('consumed receipt cannot be soft deleted', $$SELECT public.soft_delete_record('billet_entries','41000000-0000-0000-0000-000000000001')$$);
SELECT pg_temp.expect_error('consumed receipt cannot move stock groups', $$UPDATE public.billet_entries SET company_id='21000000-0000-0000-0000-000000000005' WHERE id='41000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error('linked heat cannot be soft deleted', $$SELECT public.soft_delete_record('heats','31000000-0000-0000-0000-000000000001')$$);
SELECT pg_temp.expect_error('linked plan cannot be soft deleted', $$SELECT public.soft_delete_record('rod_plans','51000000-0000-0000-0000-000000000001')$$);
SELECT pg_temp.expect_error('manager cannot hard delete', $$DELETE FROM public.rod_production WHERE id='61000000-0000-0000-0000-000000000001'$$,ARRAY['42501']);
UPDATE public.heats SET created_by='11000000-0000-0000-0000-000000000001' WHERE id='31000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('manager cannot spoof metadata actor', (SELECT created_by='11000000-0000-0000-0000-000000000002' FROM public.heats WHERE id='31000000-0000-0000-0000-000000000001'));
SELECT pg_temp.assert_ok('stock RPC returns server-derived available amount', (SELECT available_billets=6 FROM public.get_billet_stock() WHERE company_id='21000000-0000-0000-0000-000000000001' AND grade_id='21000000-0000-0000-0000-000000000002' AND size_id='21000000-0000-0000-0000-000000000003'));
SELECT pg_temp.expect_error('clients cannot change private stock counters', $$SELECT private.apply_stock_delta('21000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000003',100)$$,ARRAY['42501']);
SELECT pg_temp.expect_error('clients cannot read private counters', $$SELECT * FROM private.stock_balances$$,ARRAY['42501']);

SELECT pg_temp.expect_error('master type identity cannot change after creation', $$UPDATE public.master_lists SET type='company' WHERE id='21000000-0000-0000-0000-000000000002'$$,ARRAY['23514']);
SELECT pg_temp.expect_error('live referenced master cannot be deleted', $$SELECT public.soft_delete_record('master_lists','21000000-0000-0000-0000-000000000002')$$,ARRAY['23503']);
SELECT pg_temp.expect_error('master names are unique ignoring case', $$INSERT INTO public.master_lists(type,name) VALUES('grade','test cz121')$$,ARRAY['23505']);
SELECT pg_temp.expect_error('control characters are rejected from labels', $$INSERT INTO public.master_lists(type,name) VALUES('company',E'Unsafe\nCompany')$$,ARRAY['23514']);
INSERT INTO public.master_lists(id,type,name) VALUES('21000000-0000-0000-0000-000000000007','company','श्री Brass 🔥');
SELECT pg_temp.assert_ok('Unicode and emoji labels are preserved', (SELECT name='श्री Brass 🔥' FROM public.master_lists WHERE id='21000000-0000-0000-0000-000000000007'));
INSERT INTO public.master_lists(id,type,name) VALUES('21000000-0000-0000-0000-000000000008','company',$$'); DROP TABLE heats; --$$);
SELECT pg_temp.assert_ok('SQL metacharacters remain literal data', EXISTS(SELECT FROM public.master_lists WHERE id='21000000-0000-0000-0000-000000000008' AND name=$$'); DROP TABLE heats; --$$) AND to_regclass('public.heats') IS NOT NULL);

-- Moving a manual output between groups must reverse one debit and apply the other.
INSERT INTO public.billet_entries(id,entry_date,custom_heat_no,company_id,grade_id,size_id,billet_count,total_weight_kg)
VALUES('41000000-0000-0000-0000-000000000002',DATE '2026-11-10','TEST-MANUAL-GROUP','21000000-0000-0000-0000-000000000005','21000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000003',5,50);
UPDATE public.rod_production SET plan_id=NULL,company_id='21000000-0000-0000-0000-000000000005' WHERE id='61000000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.assert_ok('output group move restores original group stock',
 (SELECT available_billets=10 FROM private.stock_balances WHERE company_id='21000000-0000-0000-0000-000000000001' AND grade_id='21000000-0000-0000-0000-000000000002' AND size_id='21000000-0000-0000-0000-000000000003'));
SELECT pg_temp.assert_ok('output group move consumes destination group stock',
 (SELECT available_billets=1 FROM private.stock_balances WHERE company_id='21000000-0000-0000-0000-000000000005' AND grade_id='21000000-0000-0000-0000-000000000002' AND size_id='21000000-0000-0000-0000-000000000003'));
SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000002');
UPDATE public.rod_production SET plan_id='51000000-0000-0000-0000-000000000001',company_id='21000000-0000-0000-0000-000000000001' WHERE id='61000000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.assert_ok('moving output back restores its original debit',
 (SELECT available_billets=6 FROM private.stock_balances WHERE company_id='21000000-0000-0000-0000-000000000001' AND grade_id='21000000-0000-0000-0000-000000000002' AND size_id='21000000-0000-0000-0000-000000000003'));
SELECT pg_temp.assert_ok('moving output back restores destination stock',
 (SELECT available_billets=5 FROM private.stock_balances WHERE company_id='21000000-0000-0000-0000-000000000005' AND grade_id='21000000-0000-0000-0000-000000000002' AND size_id='21000000-0000-0000-0000-000000000003'));
SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000002');

-- Viewer has read access but direct writes, including role escalation, fail.
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000005');
DO $$
DECLARE entity text;
BEGIN
 FOREACH entity IN ARRAY ARRAY['heats','heat_materials','spectro_results','billet_entries','rod_plans','rod_production','master_lists','app_config'] LOOP
   EXECUTE format('SELECT pg_temp.assert_ok(%L, EXISTS(SELECT FROM public.%I))', 'viewer can read ' || entity,entity);
   PERFORM pg_temp.expect_error('viewer cannot insert ' || entity,pg_temp.copy_insert_statement(entity),ARRAY['42501']);
 END LOOP;
END;
$$;
UPDATE public.heats SET heat_no='VIEWER-OVERWRITE' WHERE id='31000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('viewer update affects no rows',
 (SELECT heat_no='TEST-HEAT-001' FROM public.heats WHERE id='31000000-0000-0000-0000-000000000001'));
UPDATE public.profiles SET role='admin' WHERE id='11000000-0000-0000-0000-000000000005';
SELECT pg_temp.assert_ok('viewer cannot elevate own role',
 (SELECT role='viewer' FROM public.profiles WHERE id='11000000-0000-0000-0000-000000000005'));
SELECT pg_temp.expect_error('viewer cannot invoke soft-delete RPC', $$SELECT public.soft_delete_record('rod_production','61000000-0000-0000-0000-000000000001')$$,ARRAY['42501']);
SELECT pg_temp.assert_ok('viewer cannot read audit data',(SELECT count(*)=0 FROM public.audit_log));
SELECT pg_temp.expect_error('viewer cannot insert forged audit', $$INSERT INTO public.audit_log(table_name,record_id,operation) VALUES('heats','31000000-0000-0000-0000-000000000001','INSERT')$$,ARRAY['42501']);
SELECT pg_temp.expect_error('viewer cannot mutate audit', $$UPDATE public.audit_log SET old_value='{}'$$,ARRAY['42501']);
SELECT pg_temp.expect_error('viewer cannot delete audit', $$DELETE FROM public.audit_log$$,ARRAY['42501']);
SELECT pg_temp.expect_error('viewer cannot write profile directly', $$INSERT INTO public.profiles(id,full_name,role) VALUES('11000000-0000-0000-0000-000000000006','Injected Admin','admin')$$,ARRAY['42501']);

-- Operators can write only their department, even by bypassing the UI.
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000003');
UPDATE public.heats SET furnace_no='F2' WHERE id='31000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('furnace operator can update furnace records',
 (SELECT furnace_no='F2' FROM public.heats WHERE id='31000000-0000-0000-0000-000000000001'));
UPDATE public.rod_plans SET planned_weight_kg=1 WHERE id='51000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('furnace operator cannot update production records',
 (SELECT planned_weight_kg=80 FROM public.rod_plans WHERE id='51000000-0000-0000-0000-000000000001'));
SELECT pg_temp.expect_error('furnace operator cannot delete production through RPC', $$SELECT public.soft_delete_record('rod_production','61000000-0000-0000-0000-000000000001')$$,ARRAY['42501']);
SELECT pg_temp.expect_error('furnace operator cannot insert production', pg_temp.copy_insert_statement('billet_entries'),ARRAY['42501']);
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000004');
UPDATE public.rod_plans SET planned_weight_kg=81 WHERE id='51000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('production operator can update production records',
 (SELECT planned_weight_kg=81 FROM public.rod_plans WHERE id='51000000-0000-0000-0000-000000000001'));
UPDATE public.heats SET furnace_no='UNAUTHORIZED' WHERE id='31000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('production operator cannot update furnace records',
 (SELECT furnace_no='F2' FROM public.heats WHERE id='31000000-0000-0000-0000-000000000001'));
SELECT pg_temp.expect_error('production operator cannot delete furnace through RPC', $$SELECT public.soft_delete_record('heats','31000000-0000-0000-0000-000000000001')$$,ARRAY['42501']);
SELECT pg_temp.expect_error('production operator cannot insert furnace', pg_temp.copy_insert_statement('heats'),ARRAY['42501']);

-- Exercise each role against every table through SQL, including denied writes.
DO $$
DECLARE actor_role text; actor_id uuid; entity text; affected bigint; allowed boolean;
BEGIN
  FOR actor_role,actor_id IN SELECT * FROM (VALUES
    ('admin','11000000-0000-0000-0000-000000000001'::uuid),
    ('manager','11000000-0000-0000-0000-000000000002'::uuid),
    ('furnace_operator','11000000-0000-0000-0000-000000000003'::uuid),
    ('production_operator','11000000-0000-0000-0000-000000000004'::uuid),
    ('viewer','11000000-0000-0000-0000-000000000005'::uuid)) AS actors(role_name,user_id)
  LOOP
    PERFORM pg_temp.actor(actor_id);
    FOREACH entity IN ARRAY ARRAY['profiles','master_lists','heats','heat_materials','spectro_results','billet_entries','rod_plans','rod_production','app_config','audit_log'] LOOP
      EXECUTE format('SELECT count(*) FROM public.%I',entity) INTO affected;
      PERFORM pg_temp.assert_ok(actor_role || ': SELECT ' || entity,
        CASE WHEN entity='audit_log' AND actor_role<>'admin' THEN affected=0 ELSE affected>0 END);
      PERFORM pg_temp.expect_error(actor_role || ': hard DELETE ' || entity || ' denied',format('DELETE FROM public.%I',entity),ARRAY['42501']);
      IF entity<>'audit_log' THEN
        allowed:=actor_role='admin'
          OR (actor_role='manager' AND entity NOT IN ('profiles','app_config'))
          OR (actor_role='furnace_operator' AND entity IN ('heats','heat_materials','spectro_results'))
          OR (actor_role='production_operator' AND entity IN ('billet_entries','rod_plans','rod_production'));
        EXECUTE format('UPDATE public.%I SET updated_at=updated_at',entity);
        GET DIAGNOSTICS affected=ROW_COUNT;
        PERFORM pg_temp.assert_ok(actor_role || ': UPDATE ' || entity || ' role matrix', (affected>0)=allowed);
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Verified, active profiles and admin MFA are checked by the database itself.
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000006');
SELECT pg_temp.expect_error('inactive user cannot call deletion RPC', $$SELECT public.soft_delete_record('heats','31000000-0000-0000-0000-000000000001')$$,ARRAY['42501']);
SELECT pg_temp.assert_ok('inactive profile cannot read heats',(SELECT count(*)=0 FROM public.heats));
SELECT pg_temp.expect_error('inactive profile cannot create records', $$INSERT INTO public.heats(entry_date,shift,furnace_no,heat_no,start_time,ready_time,grade_id) VALUES(CURRENT_DATE,'Day','F1','DENIED-HEAT','10:00','11:00','21000000-0000-0000-0000-000000000002')$$,ARRAY['42501']);
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000007');
SELECT pg_temp.expect_error('unverified user cannot call deletion RPC', $$SELECT public.soft_delete_record('heats','31000000-0000-0000-0000-000000000001')$$,ARRAY['42501']);
SELECT pg_temp.assert_ok('unverified email cannot read heats',(SELECT count(*)=0 FROM public.heats));
SELECT pg_temp.expect_error('unverified email cannot create records', $$INSERT INTO public.heats(entry_date,shift,furnace_no,heat_no,start_time,ready_time,grade_id) VALUES(CURRENT_DATE,'Day','F1','DENIED-HEAT','10:00','11:00','21000000-0000-0000-0000-000000000002')$$,ARRAY['42501']);
RESET ROLE;
UPDATE auth.users SET banned_until=now()+interval '1 hour' WHERE id='11000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000002');
SELECT pg_temp.assert_ok('banned auth user cannot read protected data',(SELECT count(*)=0 FROM public.heats));
RESET ROLE;
UPDATE auth.users SET banned_until=NULL,deleted_at=now() WHERE id='11000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok('deleted auth user cannot read protected data',(SELECT count(*)=0 FROM public.heats));
RESET ROLE;
UPDATE auth.users SET deleted_at=NULL WHERE id='11000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000001','aal1');
SELECT pg_temp.assert_ok('admin without MFA cannot read protected data',(SELECT count(*)=0 FROM public.heats));
SELECT pg_temp.expect_error('admin without MFA cannot insert records', $$INSERT INTO public.heats(entry_date,shift,furnace_no,heat_no,start_time,ready_time,grade_id) VALUES(CURRENT_DATE,'Day','F1','DENIED-HEAT','10:00','11:00','21000000-0000-0000-0000-000000000002')$$,ARRAY['42501']);
SELECT pg_temp.actor('ffffffff-ffff-ffff-ffff-ffffffffffff');
SELECT pg_temp.assert_ok('unknown identity cannot read heats',(SELECT count(*)=0 FROM public.heats));

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true);
SELECT pg_temp.expect_error('anonymous cannot select factory records', $$SELECT * FROM public.heats$$,ARRAY['42501']);
SELECT pg_temp.expect_error('anonymous cannot query stock view', $$SELECT * FROM public.billet_stock$$,ARRAY['42501']);
SELECT pg_temp.expect_error('anonymous cannot call deletion RPC', $$SELECT public.soft_delete_record('heats','31000000-0000-0000-0000-000000000001')$$,ARRAY['42501']);
SELECT pg_temp.expect_error('anonymous cannot call stock RPC', $$SELECT * FROM public.get_billet_stock()$$,ARRAY['42501']);

SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000001');
SELECT pg_temp.assert_ok('MFA admin can see audit trail',
 EXISTS(SELECT FROM public.audit_log WHERE table_name='rod_production' AND record_id='61000000-0000-0000-0000-000000000001' AND actor_id='11000000-0000-0000-0000-000000000002' AND operation='INSERT'));
SELECT pg_temp.assert_ok('audit captures before and after values',
 EXISTS(SELECT FROM public.audit_log WHERE table_name='heats' AND record_id='31000000-0000-0000-0000-000000000001' AND old_value->>'furnace_no'='F1' AND new_value->>'furnace_no'='F2'));
SELECT pg_temp.expect_error('admin cannot alter audit history', $$UPDATE public.audit_log SET new_value='{}'$$,ARRAY['42501']);
SELECT pg_temp.expect_error('admin cannot delete audit history', $$DELETE FROM public.audit_log$$,ARRAY['42501']);
UPDATE public.app_config SET maintenance_mode=true WHERE id='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('MFA admin can change app configuration',
 (SELECT maintenance_mode FROM public.app_config WHERE id='00000000-0000-0000-0000-000000000001'));
SELECT pg_temp.expect_error('app minimum version must be semantic', $$UPDATE public.app_config SET min_supported_app_version='garbage' WHERE id='00000000-0000-0000-0000-000000000001'$$,ARRAY['23514']);
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000002');
UPDATE public.app_config SET maintenance_mode=false WHERE id='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('manager cannot change app configuration',
 (SELECT maintenance_mode FROM public.app_config WHERE id='00000000-0000-0000-0000-000000000001'));
SELECT pg_temp.expect_error('P2-F001 direct soft delete cannot weaken deleted-row read policy', $$UPDATE public.rod_production SET deleted_at=now() WHERE id='61000000-0000-0000-0000-000000000001'$$,ARRAY['42501']);
SELECT pg_temp.expect_error('soft-delete RPC cannot target arbitrary tables', $$SELECT public.soft_delete_record('heats; DROP TABLE profiles; --','31000000-0000-0000-0000-000000000001')$$,ARRAY['42501','22023']);
SELECT pg_temp.assert_ok('authorized soft-delete RPC succeeds',public.soft_delete_record('rod_production','61000000-0000-0000-0000-000000000001'));
SELECT pg_temp.assert_ok('soft deletion is idempotent', NOT public.soft_delete_record('rod_production','61000000-0000-0000-0000-000000000001'));
SELECT pg_temp.assert_ok('soft deleted output is hidden from manager',
 NOT EXISTS(SELECT FROM public.rod_production WHERE id='61000000-0000-0000-0000-000000000001'));
UPDATE public.rod_production SET deleted_at=NULL WHERE id='61000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('manager cannot restore a soft deleted output',
 NOT EXISTS(SELECT FROM public.rod_production WHERE id='61000000-0000-0000-0000-000000000001'));
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000005');
SELECT pg_temp.assert_ok('soft deleted output is hidden from viewer',
 NOT EXISTS(SELECT FROM public.rod_production WHERE id='61000000-0000-0000-0000-000000000001'));
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000001');
SELECT pg_temp.assert_ok('admin can inspect deleted records',
 EXISTS(SELECT FROM public.rod_production WHERE id='61000000-0000-0000-0000-000000000001' AND deleted_at IS NOT NULL));
UPDATE public.rod_production SET deleted_at=NULL WHERE id='61000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_ok('admin can restore output',
 EXISTS(SELECT FROM public.rod_production WHERE id='61000000-0000-0000-0000-000000000001' AND deleted_at IS NULL));
SELECT pg_temp.assert_ok('audit records restore operation',
 EXISTS(SELECT FROM public.audit_log WHERE record_id='61000000-0000-0000-0000-000000000001' AND operation='RESTORE'));

-- Count is enforced by one atomically updated capacity row, not count(*) races.
RESET ROLE;
INSERT INTO auth.users(id,email,email_confirmed_at)
SELECT ('12000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,'cap-'||n||'@example.test',now() FROM generate_series(1,15)n;
INSERT INTO public.profiles(id,full_name,role,is_active)
SELECT ('12000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,'Capacity User '||n,'viewer',true FROM generate_series(1,14)n;
SELECT pg_temp.assert_ok('exactly 20 active users are permitted',
 (SELECT count(*)=20 FROM public.profiles WHERE is_active AND deleted_at IS NULL));
SELECT pg_temp.expect_error('21st active profile is rejected', $$INSERT INTO public.profiles(id,full_name,role,is_active) VALUES('12000000-0000-0000-0000-000000000015','Capacity User 15','viewer',true)$$);
INSERT INTO public.profiles(id,full_name,role,is_active)
VALUES('12000000-0000-0000-0000-000000000015','Capacity User 15','viewer',false);
SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect_error('21st user cannot be activated', $$UPDATE public.profiles SET is_active=true WHERE id='12000000-0000-0000-0000-000000000015'$$);
UPDATE public.profiles SET is_active=false WHERE id='12000000-0000-0000-0000-000000000014';
UPDATE public.profiles SET is_active=true WHERE id='12000000-0000-0000-0000-000000000015';
SELECT pg_temp.assert_ok('deactivation frees a slot for activation',
 (SELECT count(*)=20 FROM public.profiles WHERE is_active AND deleted_at IS NULL));
SELECT pg_temp.expect_error('freed user cannot reactivate over the cap', $$UPDATE public.profiles SET is_active=true WHERE id='12000000-0000-0000-0000-000000000014'$$);
RESET ROLE;
SELECT pg_temp.assert_ok('private user capacity agrees with profiles',
 (SELECT active_users=(SELECT count(*) FROM public.profiles WHERE is_active AND deleted_at IS NULL) FROM private.user_capacity));
SELECT pg_temp.assert_ok('stock counter agrees after production restore',
 (SELECT available_billets=6 FROM private.stock_balances WHERE company_id='21000000-0000-0000-0000-000000000001' AND grade_id='21000000-0000-0000-0000-000000000002' AND size_id='21000000-0000-0000-0000-000000000003'));
SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000004');
UPDATE public.rod_production SET billets_used=7 WHERE id='61000000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.assert_ok('editing output applies only the stock delta',
 (SELECT available_billets=3 FROM private.stock_balances WHERE company_id='21000000-0000-0000-0000-000000000001' AND grade_id='21000000-0000-0000-0000-000000000002' AND size_id='21000000-0000-0000-0000-000000000003'));
SET LOCAL ROLE authenticated;
SELECT pg_temp.actor('11000000-0000-0000-0000-000000000004');
SELECT pg_temp.assert_ok('authorized soft-delete RPC succeeds',public.soft_delete_record('rod_production','61000000-0000-0000-0000-000000000001'));
RESET ROLE;
SELECT pg_temp.assert_ok('soft deletion restores all consumed stock',
 (SELECT available_billets=10 FROM private.stock_balances WHERE company_id='21000000-0000-0000-0000-000000000001' AND grade_id='21000000-0000-0000-0000-000000000002' AND size_id='21000000-0000-0000-0000-000000000003'));
SELECT pg_temp.assert_ok('failed stock operations leave all other groups nonnegative',
 NOT EXISTS(SELECT FROM private.stock_balances WHERE available_billets<0));
SELECT 'DATABASE_ASSERTIONS=' || current_setting('brassworks_test.pass_count');
ROLLBACK;
