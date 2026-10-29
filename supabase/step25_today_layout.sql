begin;

alter table public.profiles add column if not exists today_layout jsonb;

create or replace function public.normalize_today_layout(value jsonb)
returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare defaults constant jsonb:='[{"id":"events","enabled":true},{"id":"todos","enabled":true},{"id":"habits","enabled":true},{"id":"quick_record","enabled":true},{"id":"protein","enabled":false},{"id":"finance_entry","enabled":false},{"id":"finance_budget","enabled":false}]'::jsonb; result jsonb:='[]'::jsonb; item jsonb; allowed text[]:=array['events','todos','habits','quick_record','protein','finance_entry','finance_budget']; seen text[]:=array[]::text[];
begin
  if value is null then return defaults; end if;
  if jsonb_typeof(value)<>'array' or jsonb_array_length(value)>7 then raise exception '오늘 화면 구성 형식을 확인해 주세요.';end if;
  for item in select x from jsonb_array_elements(value) x loop
    if jsonb_typeof(item)<>'object' or not (item ? 'id') or not (item ? 'enabled') or item->>'id'<>all(allowed) or jsonb_typeof(item->'enabled')<>'boolean' or item->>'id'=any(seen) then raise exception '오늘 화면 구성 항목을 확인해 주세요.';end if;
    seen:=array_append(seen,item->>'id');result:=result||jsonb_build_array(jsonb_build_object('id',item->>'id','enabled',(item->>'enabled')::boolean));
  end loop;
  for item in select x from jsonb_array_elements(defaults) x loop if not (item->>'id'=any(seen)) then result:=result||jsonb_build_array(item);end if;end loop;
  return result;
end $$;

update public.profiles set today_layout=public.normalize_today_layout(today_layout);
alter table public.profiles alter column today_layout set default public.normalize_today_layout(null),alter column today_layout set not null;
alter table public.profiles drop constraint if exists profiles_today_layout_valid;
alter table public.profiles add constraint profiles_today_layout_valid check(today_layout=public.normalize_today_layout(today_layout));

alter function public.restore_my_data(jsonb) rename to restore_my_data_before_today_layout;
revoke all on function public.restore_my_data_before_today_layout(jsonb) from public,anon,authenticated;
create function public.restore_my_data(p_backup jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();result jsonb;layout jsonb;
begin
 if u is null then raise exception '로그인이 필요합니다.';end if;
 result:=public.restore_my_data_before_today_layout(p_backup);
 if p_backup->'profiles'->0 ? 'today_layout' then
  layout:=public.normalize_today_layout(p_backup->'profiles'->0->'today_layout');
  update public.profiles set today_layout=layout where id=u;
 end if;
 return result;
end $$;
revoke all on function public.normalize_today_layout(jsonb),public.restore_my_data(jsonb) from public,anon;
grant execute on function public.normalize_today_layout(jsonb),public.restore_my_data(jsonb) to authenticated;
commit;
