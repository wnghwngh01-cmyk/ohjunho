begin;

create table public.finance_budget_months (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (month = date_trunc('month',month)::date and month between date '2000-01-01' and date '2100-12-01'),
  revision integer not null default 1 check (revision > 0),
  inherited_from date,
  updated_at timestamptz not null default now(),
  primary key(user_id,month)
);
create table public.finance_budget_items (
  user_id uuid not null,
  month date not null,
  category text not null check (length(trim(category)) between 1 and 80),
  amount bigint not null check (amount between 0 and 999999999999),
  primary key(user_id,month,category),
  foreign key(user_id,month) references public.finance_budget_months(user_id,month) on delete cascade
);
alter table public.finance_budget_months enable row level security;
alter table public.finance_budget_items enable row level security;
create policy budget_months_read on public.finance_budget_months for select to authenticated using (user_id=auth.uid());
create policy budget_items_read on public.finance_budget_items for select to authenticated using (user_id=auth.uid());
revoke all on public.finance_budget_months,public.finance_budget_items from anon,authenticated;
grant select on public.finance_budget_months,public.finance_budget_items to authenticated;

-- Called only under a per-user transaction lock. Seal elapsed months before an
-- older setting can change: this also preserves explicit all-cleared months.
create function public.seal_budget_months(p_uid uuid,p_from date,p_through date)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare m date; source_month date;
begin
  if p_from is null or p_from>p_through then return; end if;
  for m in select generate_series(p_from,p_through,interval '1 month')::date loop
    if not exists(select 1 from finance_budget_months where user_id=p_uid and month=m) then
      select max(month) into source_month from finance_budget_months where user_id=p_uid and month<m;
      insert into finance_budget_months(user_id,month,inherited_from) values(p_uid,m,source_month);
      insert into finance_budget_items(user_id,month,category,amount)
        select p_uid,m,category,amount from finance_budget_items where user_id=p_uid and month=source_month;
    end if;
  end loop;
end $$;
revoke all on function public.seal_budget_months(uuid,date,date) from public,anon,authenticated;

create function public.get_month_budget(p_month date)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); current_month date:=date_trunc('month',now() at time zone 'Asia/Seoul')::date;
  first_month date; source_month date; rev integer; inherited date;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  if p_month is null or p_month<>date_trunc('month',p_month)::date or p_month not between date '2000-01-01' and date '2100-12-01' then raise exception '월을 확인해 주세요.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,22));
  select min(month) into first_month from finance_budget_months where user_id=u;
  perform seal_budget_months(u,first_month,current_month);
  select revision,inherited_from into rev,inherited from finance_budget_months where user_id=u and month=p_month;
  source_month:=p_month;
  if rev is null then select max(month) into source_month from finance_budget_months where user_id=u and month<p_month; end if;
  return jsonb_build_object('month',p_month,'revision',coalesce(rev,0),
    'status',case when rev is not null then 'saved' when source_month is not null then 'inherited' else 'none' end,
    'source_month',case when rev is null then source_month else inherited end,
    'items',coalesce((select jsonb_object_agg(category,amount) from finance_budget_items where user_id=u and month=source_month),'{}'::jsonb));
end $$;

create function public.save_month_budget(p_month date,p_items jsonb,p_revision integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); current_month date:=date_trunc('month',now() at time zone 'Asia/Seoul')::date;
  actual_revision integer; first_month date; entry record;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  if p_month is null or p_month<>date_trunc('month',p_month)::date or p_month not between date '2000-01-01' and date '2100-12-01' then raise exception '월을 확인해 주세요.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'object' or pg_column_size(p_items)>16384 then raise exception '예산 입력을 확인해 주세요.'; end if;
  if (select count(*) from jsonb_each(p_items))>100 then raise exception '분류가 너무 많습니다.'; end if;
  for entry in select * from jsonb_each(p_items) loop
    if length(trim(entry.key)) not between 1 and 80 or jsonb_typeof(entry.value)<>'number' then raise exception '분류와 금액을 확인해 주세요.'; end if;
    if (entry.value::text)::numeric<0 or (entry.value::text)::numeric>999999999999 or trunc((entry.value::text)::numeric)<>(entry.value::text)::numeric then raise exception '예산은 0 이상의 원 단위 정수로 입력해 주세요.'; end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(u::text,22));
  select revision into actual_revision from finance_budget_months where user_id=u and month=p_month;
  if p_revision is distinct from coalesce(actual_revision,0) then raise exception '다른 기기에서 예산이 변경되었습니다. 다시 불러온 뒤 저장해 주세요.'; end if;
  select least(p_month,min(month)) into first_month from finance_budget_months where user_id=u;
  perform seal_budget_months(u,first_month,current_month);
  insert into finance_budget_months(user_id,month,revision) values(u,p_month,1)
    on conflict(user_id,month) do update set revision=finance_budget_months.revision+1,inherited_from=null,updated_at=now();
  delete from finance_budget_items where user_id=u and month=p_month;
  insert into finance_budget_items(user_id,month,category,amount)
    select u,p_month,key,(value::text)::numeric::bigint from jsonb_each(p_items);
  return get_month_budget(p_month);
end $$;
revoke all on function public.get_month_budget(date),public.save_month_budget(date,jsonb,integer) from public,anon;
grant execute on function public.get_month_budget(date),public.save_month_budget(date,jsonb,integer) to authenticated;

-- Preserve the installed export/restore implementation (including later steps).
alter function public.export_my_data() rename to export_my_data_before_budgets;
alter function public.restore_my_data(jsonb) rename to restore_my_data_before_budgets;
revoke all on function public.export_my_data_before_budgets(),public.restore_my_data_before_budgets(jsonb) from public,anon,authenticated;
create function public.export_my_data() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  perform get_month_budget(date_trunc('month',now() at time zone 'Asia/Seoul')::date);
  result:=export_my_data_before_budgets();
  return result||jsonb_build_object('finance_budget_version',1,'finance_budget_months',coalesce((
    select jsonb_agg(jsonb_build_object('month',m.month,'items',coalesce((select jsonb_object_agg(i.category,i.amount) from finance_budget_items i where i.user_id=u and i.month=m.month),'{}'::jsonb)) order by m.month)
    from finance_budget_months m where m.user_id=u),'[]'::jsonb));
end $$;
create function public.restore_my_data(p_backup jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); result jsonb; entry jsonb; rev integer; count_restored integer:=0;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,22));
  result:=restore_my_data_before_budgets(p_backup);
  if p_backup ? 'finance_budget_months' then
    if p_backup->>'finance_budget_version' is distinct from '1' or jsonb_typeof(p_backup->'finance_budget_months')<>'array' then raise exception '예산 백업 형식을 확인해 주세요.'; end if;
    if jsonb_array_length(p_backup->'finance_budget_months')>1212 then raise exception '예산 백업이 너무 큽니다.'; end if;
    if exists(select 1 from jsonb_array_elements(p_backup->'finance_budget_months') x group by x->>'month' having count(*)>1) then raise exception '중복된 예산 월입니다.'; end if;
    for entry in select value from jsonb_array_elements(p_backup->'finance_budget_months') order by value->>'month' loop
      select revision into rev from finance_budget_months where user_id=u and month=(entry->>'month')::date;
      perform save_month_budget((entry->>'month')::date,entry->'items',coalesce(rev,0));
      count_restored:=count_restored+1;
    end loop;
  end if;
  return result||jsonb_build_object('budget_months',count_restored,'restored',coalesce((result->>'restored')::integer,0)+count_restored);
end $$;
revoke all on function public.export_my_data(),public.restore_my_data(jsonb) from public,anon;
grant execute on function public.export_my_data(),public.restore_my_data(jsonb) to authenticated;
commit;
