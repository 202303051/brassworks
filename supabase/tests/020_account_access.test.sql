begin;
select set_config('brassworks_test.pass_count','0',true);
create function pg_temp.assert_ok(label text, condition boolean) returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAIL: %', label; end if;
  perform set_config('brassworks_test.pass_count',(current_setting('brassworks_test.pass_count')::int+1)::text,true);
end $$;
create function pg_temp.reject(label text, statement text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
  begin execute statement; exception when insufficient_privilege then rejected:=true; end;
  perform pg_temp.assert_ok(label,rejected);
end $$;
create function pg_temp.actor(number integer, assurance text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub','12000000-0000-0000-0000-'||lpad(number::text,12,'0'),'aal',assurance,'role','admin')::text,true);
end;
$$;
insert into auth.users(id,email,email_confirmed_at) select ('12000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'access'||n||'@example.test',case when n=4 then null else now() end from generate_series(1,7) n;
insert into public.profiles(id,full_name,role,is_active) select ('12000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Access Test '||n,case when n=1 then 'admin' else 'viewer' end,n<>3 from generate_series(1,7) n;
update auth.users set banned_until=now()+interval '1 day' where email='access5@example.test';
update auth.users set deleted_at=now() where email='access6@example.test';
update public.profiles set deleted_at=now() where id='12000000-0000-0000-0000-000000000007';
select pg_temp.assert_ok('own access RPC not granted anonymously',not has_function_privilege('anon','public.get_my_access()','execute'));
select pg_temp.assert_ok('own access RPC granted to authenticated',has_function_privilege('authenticated','public.get_my_access()','execute'));
set local role authenticated;
select pg_temp.actor(1);
select pg_temp.assert_ok('Admin can discover own role before MFA',public.get_my_access()->>'role'='admin');
select pg_temp.assert_ok('pre-MFA RPC returns only own identity',public.get_my_access()->>'id'='12000000-0000-0000-0000-000000000001' and (select count(*) from jsonb_object_keys(public.get_my_access()))=3);
select pg_temp.assert_ok('pre-MFA Admin cannot list profiles',(select count(*)=0 from public.profiles));
select pg_temp.reject('pre-MFA Admin cannot create profiles',$sql$insert into public.profiles(id,full_name,role,is_active) values(gen_random_uuid(),'Blocked','viewer',true)$sql$);
select pg_temp.actor(2);
select pg_temp.assert_ok('forged JWT role does not change own profile role',public.get_my_access()->>'role'='viewer');
select pg_temp.reject('viewer cannot grant Admin',$sql$insert into public.profiles(id,full_name,role,is_active) values(gen_random_uuid(),'Blocked','admin',true)$sql$);
select pg_temp.actor(3);
select pg_temp.assert_ok('inactive account has no access response',public.get_my_access() is null);
select pg_temp.actor(4);
select pg_temp.assert_ok('unverified account has no access response',public.get_my_access() is null);
select pg_temp.actor(5);
select pg_temp.assert_ok('banned account has no access response',public.get_my_access() is null);
select pg_temp.actor(6);
select pg_temp.assert_ok('deleted Auth account has no access response',public.get_my_access() is null);
select pg_temp.actor(7);
select pg_temp.assert_ok('deleted profile has no access response',public.get_my_access() is null);
select pg_temp.actor(1,'aal2');
select pg_temp.assert_ok('MFA Admin can list profiles',(select count(*)=7 from public.profiles));
select pg_temp.reject('Admin cannot demote self',$sql$update public.profiles set role='viewer' where id='12000000-0000-0000-0000-000000000001'$sql$);
select pg_temp.reject('Admin cannot deactivate self',$sql$update public.profiles set is_active=false where id='12000000-0000-0000-0000-000000000001'$sql$);
select pg_temp.reject('Admin cannot soft-delete self',$sql$select public.soft_delete_record('profiles','12000000-0000-0000-0000-000000000001')$sql$);
update public.profiles set role='manager' where id='12000000-0000-0000-0000-000000000002';
select pg_temp.assert_ok('MFA Admin can change colleague role',(select role='manager' from public.profiles where id='12000000-0000-0000-0000-000000000002'));
select pg_temp.assert_ok('role change audit attributes actual Admin',exists(select from public.audit_log where table_name='profiles' and record_id='12000000-0000-0000-0000-000000000002' and actor_id='12000000-0000-0000-0000-000000000001' and new_value->>'role'='manager'));
update public.profiles set is_active=false where id='12000000-0000-0000-0000-000000000002';
select pg_temp.actor(2);
select pg_temp.assert_ok('deactivation immediately removes server access',public.get_my_access() is null);
reset role;
select 'DATABASE_ASSERTIONS='||current_setting('brassworks_test.pass_count');
rollback;
