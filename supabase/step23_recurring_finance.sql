begin;
create table public.finance_recurring_rules (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 tx_type text not null check(tx_type in ('income','expense')),title text not null check(length(title) between 1 and 120),
 category text not null check(length(category) between 1 and 80),amount bigint not null check(amount between 1 and 999999999999),
 record_day integer not null check(record_day between 1 and 31),start_date date not null,end_date date,
 timezone text not null default 'Asia/Seoul',status text not null default 'active' check(status in ('active','paused','ended')),
 revision integer not null default 1,next_due date,last_error text,updated_at timestamptz not null default now(),
 check(end_date is null or end_date>=start_date)
);
create table public.finance_recurring_versions (
 rule_id uuid not null references public.finance_recurring_rules(id) on delete cascade,revision integer not null,
 user_id uuid not null references auth.users(id) on delete cascade,snapshot jsonb not null,created_at timestamptz not null default now(),primary key(rule_id,revision)
);
create table public.finance_recurring_occurrences (
 rule_id uuid not null references public.finance_recurring_rules(id) on delete cascade,month date not null,
 user_id uuid not null references auth.users(id) on delete cascade,due_date date not null,revision integer not null,snapshot jsonb not null,
 transaction_id uuid references public.finance_transactions(id) on delete set null,created_at timestamptz not null default now(),
 primary key(rule_id,month),check(month=date_trunc('month',due_date)::date)
);
alter table public.finance_transactions add column recurring_rule_id uuid references public.finance_recurring_rules(id) on delete set null;
alter table public.finance_transactions add column recurring_due_date date;
-- Clients may edit/delete generated transactions but cannot forge their origin.
create function public.guard_recurring_origin() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user in ('authenticated','anon') then
  if (TG_OP='INSERT' and (new.recurring_rule_id is not null or new.recurring_due_date is not null)) or
     (TG_OP='UPDATE' and (new.recurring_rule_id is distinct from old.recurring_rule_id or new.recurring_due_date is distinct from old.recurring_due_date)) then
   raise exception '자동 기록 연결은 변경할 수 없습니다.';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_recurring_origin() from public,anon,authenticated;
create trigger guard_recurring_origin before insert or update on public.finance_transactions for each row execute function public.guard_recurring_origin();
-- Development execution gate. Only approved test accounts are enabled initially.
create table public.finance_recurring_execution_users(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.finance_recurring_execution_users enable row level security;
revoke all on public.finance_recurring_execution_users from public,anon,authenticated;
alter table public.finance_recurring_rules enable row level security;
alter table public.finance_recurring_versions enable row level security;
alter table public.finance_recurring_occurrences enable row level security;
create policy recurring_rules_read on public.finance_recurring_rules for select to authenticated using(user_id=auth.uid());
create policy recurring_versions_read on public.finance_recurring_versions for select to authenticated using(user_id=auth.uid());
create policy recurring_occurrences_read on public.finance_recurring_occurrences for select to authenticated using(user_id=auth.uid());
revoke all on public.finance_recurring_rules,public.finance_recurring_versions,public.finance_recurring_occurrences from public,anon,authenticated;
grant select on public.finance_recurring_rules,public.finance_recurring_versions,public.finance_recurring_occurrences to authenticated;

create function public.recurring_due(p_month date,p_day integer) returns date language sql immutable set search_path=public,pg_temp as $$
 select (date_trunc('month',p_month)::date + (least(p_day,extract(day from date_trunc('month',p_month)+interval '1 month - 1 day')::integer)-1))::date
$$;
create function public.recurring_validate(p jsonb,p_new boolean,p_now timestamptz) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare z text:=coalesce(nullif(p->>'timezone',''),'Asia/Seoul'); s date; e date; d numeric; a numeric;
begin
 if not exists(select 1 from pg_timezone_names where name=z) then raise exception '시간대를 확인해 주세요.'; end if;
 s:=(p->>'start_date')::date;e:=nullif(p->>'end_date','')::date;d:=(p->>'record_day')::numeric;a:=(p->>'amount')::numeric;
 if p->>'tx_type' is null or p->>'tx_type' not in ('income','expense') or length(trim(coalesce(p->>'title',''))) not between 1 and 120 or length(trim(coalesce(p->>'category',''))) not between 1 and 80 then raise exception '종류·이름·분류를 확인해 주세요.'; end if;
 if s is null or s not between date '2000-01-01' and date '2100-12-31' or (e is not null and (e<s or e>date '2100-12-31')) then raise exception '시작일과 종료일을 확인해 주세요.';end if;
 if p_new and s<(p_now at time zone z)::date then raise exception '시작일은 오늘 이후여야 합니다.';end if;
 if d is null or d<>trunc(d) or d not between 1 and 31 or a is null or a<>trunc(a) or a not between 1 and 999999999999 then raise exception '금액과 매월 기록일을 확인해 주세요.';end if;
 return jsonb_build_object('tx_type',p->>'tx_type','title',trim(p->>'title'),'category',trim(p->>'category'),'amount',a::bigint,'record_day',d::integer,'start_date',s,'end_date',e,'timezone',z);
end $$;
create function public.recurring_next(p_id uuid,p jsonb,p_now timestamptz,p_pending_month date default null) returns date language plpgsql set search_path=public,pg_temp as $$
declare floor_date date:=greatest((p_now at time zone (p->>'timezone'))::date,(p->>'start_date')::date); m date:=date_trunc('month',floor_date)::date; d date;
begin
 loop
  d:=recurring_due(m,(p->>'record_day')::integer);
  if d>date '2100-12-31' or (p->>'end_date' is not null and d>(p->>'end_date')::date) then return null;end if;
  if d>=floor_date and m is distinct from p_pending_month and not exists(select 1 from finance_recurring_occurrences where rule_id=p_id and month=m) then return d;end if;
  m:=(m+interval '1 month')::date;
 end loop;
end $$;
-- Private worker. Row lock serializes scheduler and all edits. The exception
-- block rolls back generated transactions + occurrence markers together.
create function public.process_recurring_rule(p_id uuid,p_now timestamptz) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare r finance_recurring_rules; t uuid; m date; processed integer:=0;
begin
 select * into r from finance_recurring_rules where id=p_id for update;
 if not found or r.status<>'active' then return true;end if;
 begin
  while r.next_due is not null and r.next_due<=(p_now at time zone r.timezone)::date loop
   if r.end_date is not null and r.next_due>r.end_date then r.next_due:=null;exit;end if;
   m:=date_trunc('month',r.next_due)::date;
   if not exists(select 1 from finance_recurring_occurrences where rule_id=r.id and month=m) then
    insert into finance_transactions(user_id,tx_type,title,category,amount,tx_date,recurring_rule_id,recurring_due_date)
      values(r.user_id,r.tx_type,r.title,r.category,r.amount,r.next_due,r.id,r.next_due) returning id into t;
    insert into finance_recurring_occurrences(rule_id,month,user_id,due_date,revision,snapshot,transaction_id)
      values(r.id,m,r.user_id,r.next_due,r.revision,to_jsonb(r),t);
   end if;
   r.next_due:=recurring_due((m+interval '1 month')::date,r.record_day);
   if r.next_due>date '2100-12-31' or (r.end_date is not null and r.next_due>r.end_date) then r.next_due:=null;end if;
   processed:=processed+1;if processed>=1212 then raise exception 'too many pending occurrences';end if;
  end loop;
  update finance_recurring_rules set next_due=r.next_due,status=case when r.next_due is null then 'ended' else status end,last_error=null where id=r.id;
  return true;
 exception when others then
  update finance_recurring_rules set last_error='자동 기록에 실패했습니다. 다음 서버 실행에서 다시 시도합니다. ('||SQLSTATE||')' where id=p_id;
  return false;
 end;
end $$;
create function public.run_recurring_finance() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; ok integer:=0; failed integer:=0;
begin
 for r in select x.id from finance_recurring_rules x join finance_recurring_execution_users a on a.user_id=x.user_id where x.status='active' and x.next_due<=(now() at time zone x.timezone)::date order by x.id for update of x skip locked loop
  if process_recurring_rule(r.id,now()) then ok:=ok+1;else failed:=failed+1;end if;
 end loop;
 return jsonb_build_object('processed_rules',ok,'failed_rules',failed);
end $$;
create function public.preview_recurring_finance(p_id uuid,p_fields jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p jsonb;r finance_recurring_rules;pending date;
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.';end if;
 if p_id is not null then select * into r from finance_recurring_rules where id=p_id and user_id=auth.uid();if not found then raise exception '규칙을 찾을 수 없습니다.';end if;end if;
 p:=recurring_validate(p_fields,p_id is null,now());
 if r.status='active' and r.next_due<=(now() at time zone r.timezone)::date then pending:=date_trunc('month',(now() at time zone r.timezone)::date)::date;
 -- Only exclude this month if the old rule actually has a due occurrence in it.
 if recurring_due(pending,r.record_day)>(now() at time zone r.timezone)::date or (r.end_date is not null and recurring_due(pending,r.record_day)>r.end_date) then pending:=null;end if;
 end if;
 return jsonb_build_object('next_due',recurring_next(p_id,p,now(),pending),'timezone',p->>'timezone','fields',p);
end $$;
create function public.save_recurring_finance(p_id uuid,p_fields jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r finance_recurring_rules;p jsonb;n date;
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.';end if;
 p:=recurring_validate(p_fields,p_id is null,now());
 if p_id is null then
  if (select count(*) from finance_recurring_rules where user_id=auth.uid() and status<>'ended')>=100 then raise exception '정기 거래는 최대 100개까지 설정할 수 있습니다.';end if;
  n:=recurring_next(null,p,now());if n is null then raise exception '기간 안에 기록 예정일이 없습니다.';end if;
  insert into finance_recurring_rules(user_id,tx_type,title,category,amount,record_day,start_date,end_date,timezone,next_due)
   values(auth.uid(),p->>'tx_type',p->>'title',p->>'category',(p->>'amount')::bigint,(p->>'record_day')::integer,(p->>'start_date')::date,(p->>'end_date')::date,p->>'timezone',n) returning * into r;
 else
  select * into r from finance_recurring_rules where id=p_id and user_id=auth.uid() for update;
  if not found or r.revision is distinct from p_revision then raise exception '규칙이 변경되었습니다. 목록을 다시 불러와 주세요.';end if;
  if r.status='ended' then raise exception '종료된 규칙은 수정할 수 없습니다.';end if;
  if not process_recurring_rule(r.id,now()) then raise exception '기존 예정분 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';end if;
  n:=recurring_next(r.id,p,now());
  update finance_recurring_rules set tx_type=p->>'tx_type',title=p->>'title',category=p->>'category',amount=(p->>'amount')::bigint,record_day=(p->>'record_day')::integer,start_date=(p->>'start_date')::date,end_date=(p->>'end_date')::date,timezone=p->>'timezone',next_due=case when r.status='paused' then null else n end,status=case when r.status='paused' then 'paused' when n is null then 'ended' else 'active' end,revision=r.revision+1,updated_at=now(),last_error=null where id=r.id returning * into r;
 end if;
 insert into finance_recurring_versions(rule_id,user_id,revision,snapshot) values(r.id,r.user_id,r.revision,to_jsonb(r));
 return to_jsonb(r);
end $$;
create function public.set_recurring_finance_status(p_id uuid,p_action text,p_revision integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r finance_recurring_rules;n date;
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.';end if;
 select * into r from finance_recurring_rules where id=p_id and user_id=auth.uid() for update;
 if not found or r.revision is distinct from p_revision then raise exception '규칙이 변경되었습니다. 목록을 다시 불러와 주세요.';end if;
 if r.status='ended' then raise exception '이미 종료된 규칙입니다.';end if;
 if p_action is null or p_action not in ('pause','resume','end') then raise exception '동작을 확인해 주세요.';end if;
 if not process_recurring_rule(r.id,now()) then raise exception '기존 예정분 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';end if;
 if p_action='resume' then n:=recurring_next(r.id,to_jsonb(r),now());if n is null then raise exception '기간 안에 다음 기록일이 없습니다.';end if;end if;
 update finance_recurring_rules set status=case p_action when 'pause' then 'paused' when 'resume' then 'active' else 'ended' end,next_due=n,revision=revision+1,last_error=null,updated_at=now() where id=r.id returning * into r;
 insert into finance_recurring_versions(rule_id,user_id,revision,snapshot) values(r.id,r.user_id,r.revision,to_jsonb(r));return to_jsonb(r);
end $$;
-- Explicit grants: helpers and workers are never callable by a client.
revoke all on function public.recurring_due(date,integer),public.recurring_validate(jsonb,boolean,timestamptz),public.recurring_next(uuid,jsonb,timestamptz,date),public.process_recurring_rule(uuid,timestamptz),public.run_recurring_finance() from public,anon,authenticated;
revoke all on function public.preview_recurring_finance(uuid,jsonb),public.save_recurring_finance(uuid,jsonb,integer),public.set_recurring_finance_status(uuid,text,integer) from public,anon;
grant execute on function public.preview_recurring_finance(uuid,jsonb),public.save_recurring_finance(uuid,jsonb,integer),public.set_recurring_finance_status(uuid,text,integer) to authenticated;
commit;
