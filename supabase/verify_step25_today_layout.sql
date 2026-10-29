begin;

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='today_layout' and data_type='jsonb' and is_nullable='NO') as column_ok,
  exists(select 1 from pg_constraint where conname='profiles_today_layout_valid') as constraint_ok,
  to_regprocedure('public.normalize_today_layout(jsonb)') is not null as normalize_ok,
  to_regprocedure('public.restore_my_data(jsonb)') is not null as restore_ok,
  has_function_privilege('authenticated','public.restore_my_data(jsonb)','execute') as authenticated_restore,
  has_function_privilege('anon','public.restore_my_data(jsonb)','execute') as anon_restore,
  public.normalize_today_layout('[{"id":"protein","enabled":true}]'::jsonb) as normalized;

do $$
declare
  u uuid;
  backup jsonb;
  desired constant jsonb := '[{"id":"finance_budget","enabled":true},{"id":"events","enabled":false},{"id":"todos","enabled":true},{"id":"habits","enabled":true},{"id":"quick_record","enabled":false},{"id":"protein","enabled":true},{"id":"finance_entry","enabled":false}]'::jsonb;
begin
  select p.id into u
  from public.profiles p
  join auth.users a on a.id=p.id
  where lower(coalesce(a.email,'')) like 'test1%' or p.display_name='테스트1'
  order by case when lower(coalesce(a.email,'')) like 'test1%' then 0 else 1 end
  limit 1;
  if u is null then raise exception '승인된 test1 검증 계정을 찾을 수 없습니다.';end if;
  perform set_config('request.jwt.claim.sub',u::text,true);
  backup:=public.export_my_data();
  backup:=jsonb_set(backup,'{profiles,0,today_layout}',desired,true);
  perform public.restore_my_data(backup);
  if (select today_layout from public.profiles where id=u) is distinct from desired then raise exception 'today_layout 복원 결과가 일치하지 않습니다.';end if;
end $$;

select
  true as authenticated_restore_roundtrip_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='today_layout' and data_type='jsonb' and is_nullable='NO') as column_ok,
  exists(select 1 from pg_constraint where conname='profiles_today_layout_valid') as constraint_ok,
  to_regprocedure('public.normalize_today_layout(jsonb)') is not null as normalize_ok,
  to_regprocedure('public.restore_my_data(jsonb)') is not null as restore_ok,
  has_function_privilege('authenticated','public.restore_my_data(jsonb)','execute') as authenticated_restore,
  has_function_privilege('anon','public.restore_my_data(jsonb)','execute') as anon_restore,
  public.normalize_today_layout('[{"id":"protein","enabled":true}]'::jsonb) as normalized;
rollback;
