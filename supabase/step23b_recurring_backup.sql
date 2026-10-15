begin;
alter function public.export_my_data() rename to export_my_data_before_recurring;
alter function public.restore_my_data(jsonb) rename to restore_my_data_before_recurring;
revoke all on function public.export_my_data_before_recurring(),public.restore_my_data_before_recurring(jsonb) from public,anon,authenticated;
create function public.export_my_data() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();b jsonb;
begin
 if u is null then raise exception '로그인이 필요합니다.';end if;
 b:=export_my_data_before_recurring();
 return b||jsonb_build_object('recurring_version',1,
 'recurring_rules',coalesce((select jsonb_agg(to_jsonb(r)) from finance_recurring_rules r where user_id=u),'[]'::jsonb),
 'recurring_occurrences',coalesce((select jsonb_agg(to_jsonb(o)) from finance_recurring_occurrences o where user_id=u),'[]'::jsonb),
 'recurring_versions',coalesce((select jsonb_agg(to_jsonb(v)) from finance_recurring_versions v where user_id=u),'[]'::jsonb));
end $$;
create function public.restore_my_data(p_backup jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();result jsonb;r jsonb;p jsonb;existing finance_recurring_rules;rid uuid;tid uuid;count_rules integer:=0;
begin
 if u is null then raise exception '로그인이 필요합니다.';end if;
 result:=restore_my_data_before_recurring(p_backup);
 if not (p_backup ? 'recurring_rules') then return result;end if;
 if p_backup->>'recurring_version' is distinct from '1' or jsonb_typeof(p_backup->'recurring_rules')<>'array' or jsonb_typeof(p_backup->'recurring_occurrences') is distinct from 'array' or jsonb_typeof(p_backup->'recurring_versions') is distinct from 'array' then raise exception '정기 거래 백업 형식을 확인해 주세요.';end if;
 if jsonb_array_length(p_backup->'recurring_rules')>1000 or jsonb_array_length(p_backup->'recurring_occurrences')>5000 or jsonb_array_length(p_backup->'recurring_versions')>10000 then raise exception '정기 거래 백업이 너무 큽니다.';end if;
 for r in select value from jsonb_array_elements(p_backup->'recurring_rules') order by value->>'id' loop
  if r->>'user_id' is distinct from u::text then raise exception '다른 사용자의 규칙입니다.';end if;
  rid:=(r->>'id')::uuid;p:=recurring_validate(r,false,now());
  select * into existing from finance_recurring_rules where id=rid for update;
  if found and existing.user_id<>u then raise exception '다른 사용자의 규칙입니다.';end if;
  if existing.id is not null and not process_recurring_rule(rid,now()) then raise exception '기존 예정분 처리 후 다시 복원해 주세요.';end if;
  insert into finance_recurring_rules(id,user_id,tx_type,title,category,amount,record_day,start_date,end_date,timezone,status,revision,next_due)
  values(rid,u,p->>'tx_type',p->>'title',p->>'category',(p->>'amount')::bigint,(p->>'record_day')::integer,(p->>'start_date')::date,(p->>'end_date')::date,p->>'timezone',case when r->>'status'='ended' then 'ended' else 'paused' end,greatest(coalesce(existing.revision,0),coalesce((r->>'revision')::integer,1))+1,null)
  on conflict(id) do update set tx_type=excluded.tx_type,title=excluded.title,category=excluded.category,amount=excluded.amount,record_day=excluded.record_day,start_date=excluded.start_date,end_date=excluded.end_date,timezone=excluded.timezone,status=excluded.status,revision=excluded.revision,next_due=null,last_error=null,updated_at=now();
  count_rules:=count_rules+1;
 end loop;
 for r in select value from jsonb_array_elements(p_backup->'recurring_occurrences') loop
  rid:=(r->>'rule_id')::uuid;
  if r->>'user_id' is distinct from u::text or not exists(select 1 from finance_recurring_rules where id=rid and user_id=u) then raise exception '발생 이력 소유자가 다릅니다.';end if;
  tid:=(r->>'transaction_id')::uuid;
  if tid is not null and not exists(select 1 from finance_transactions where id=tid and user_id=u) then tid:=null;end if;
  insert into finance_recurring_occurrences(rule_id,month,user_id,due_date,revision,snapshot,transaction_id)
   values(rid,(r->>'month')::date,u,(r->>'due_date')::date,(r->>'revision')::integer,r->'snapshot',tid) on conflict(rule_id,month) do nothing;
 end loop;
 for r in select value from jsonb_array_elements(p_backup->'recurring_versions') loop
  rid:=(r->>'rule_id')::uuid;
  if r->>'user_id' is distinct from u::text or not exists(select 1 from finance_recurring_rules where id=rid and user_id=u) then raise exception '규칙 이력 소유자가 다릅니다.';end if;
  insert into finance_recurring_versions(rule_id,revision,user_id,snapshot) values(rid,(r->>'revision')::integer,u,r->'snapshot') on conflict do nothing;
 end loop;
 insert into finance_recurring_versions(rule_id,revision,user_id,snapshot) select id,revision,user_id,to_jsonb(x) from finance_recurring_rules x where user_id=u and id in (select (value->>'id')::uuid from jsonb_array_elements(p_backup->'recurring_rules')) on conflict do nothing;
 update finance_transactions t set recurring_rule_id=o.rule_id,recurring_due_date=o.due_date from finance_recurring_occurrences o where o.user_id=u and t.user_id=u and t.id=o.transaction_id;
 return result||jsonb_build_object('recurring_rules',count_rules,'restored',coalesce((result->>'restored')::integer,0)+count_rules);
end $$;
revoke all on function public.export_my_data(),public.restore_my_data(jsonb) from public,anon;
grant execute on function public.export_my_data(),public.restore_my_data(jsonb) to authenticated;
commit;
