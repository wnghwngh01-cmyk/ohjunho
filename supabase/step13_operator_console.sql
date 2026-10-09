-- Run after step12. No operator is granted automatically.
begin;
create schema if not exists admin_private;
revoke all on schema admin_private from public, anon, authenticated;
create table if not exists admin_private.operators (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table if not exists admin_private.audit (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, target text, reason text not null,
  detail jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists admin_private.restrictions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  until_at timestamptz not null, reason text not null, updated_at timestamptz not null default now()
);
create table if not exists admin_private.hidden_content (
  kind text not null check(kind in ('publications','publication_comments','feature_requests')),
  target_id uuid not null, reason text not null, created_at timestamptz not null default now(),
  primary key(kind,target_id)
);
create table if not exists admin_private.case_states (
  kind text not null, target_id uuid not null,
  status text not null check(status in ('open','reviewing','planned','resolved','dismissed')),
  note text not null default '', updated_at timestamptz not null default now(), primary key(kind,target_id)
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null default auth.uid(),
  title text not null check(length(title) between 1 and 160),
  body text not null check(length(body) between 1 and 10000),
  screen text not null default '' check(length(screen)<=80), app_version text not null default '' check(length(app_version)<=80),
  created_at timestamptz not null default now()
);
create table if not exists public.operator_messages (
  id uuid primary key default gen_random_uuid(), recipient_id uuid references auth.users(id) on delete cascade,
  title text not null check(length(title) between 1 and 160), body text not null check(length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create table if not exists public.operator_message_reads (
  message_id uuid not null references public.operator_messages(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(), primary key(message_id,user_id)
);
alter table public.support_tickets enable row level security;
alter table public.operator_messages enable row level security;
alter table public.operator_message_reads enable row level security;
revoke all on public.support_tickets,public.operator_messages,public.operator_message_reads from anon,authenticated;
grant insert,select on public.support_tickets to authenticated;
grant select on public.operator_messages to authenticated;
grant select,insert on public.operator_message_reads to authenticated;
create policy support_own_read on public.support_tickets for select to authenticated using(user_id=auth.uid());
create policy support_own_insert on public.support_tickets for insert to authenticated with check(user_id=auth.uid() and created_at between now()-interval '1 minute' and now()+interval '1 minute');
create policy message_read on public.operator_messages for select to authenticated using(recipient_id=auth.uid() or recipient_id is null);
create policy receipt_read on public.operator_message_reads for select to authenticated using(user_id=auth.uid());
create policy receipt_insert on public.operator_message_reads for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.operator_messages m where m.id=message_id));

create or replace function public.operator_access()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('operator',exists(select 1 from admin_private.operators where user_id=auth.uid()),'verified',coalesce(auth.jwt()->>'aal','')='aal2')
$$;
create or replace function admin_private.require_operator()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from admin_private.operators where user_id=auth.uid()) or coalesce(auth.jwt()->>'aal','')<>'aal2' then
   raise exception '운영자 2단계 인증이 필요합니다.' using errcode='42501';
 end if;
end $$;

-- Server-side enforcement also covers SECURITY DEFINER community mutation RPCs.
create or replace function admin_private.guard_community_write()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is not null and exists(select 1 from admin_private.restrictions where user_id=auth.uid() and until_at>now()) then
   raise exception '광장 이용이 제한된 계정입니다.' using errcode='42501';
 end if;
 if tg_table_name in ('publication_comments','publication_likes') and exists(select 1 from admin_private.hidden_content where kind='publications' and target_id=(to_jsonb(new)->>'publication_id')::uuid) then
   raise exception '운영자가 숨긴 게시물입니다.' using errcode='42501';
 end if;
 if tg_op='UPDATE' and tg_table_name in ('publications','publication_comments','feature_requests') and exists(select 1 from admin_private.hidden_content where kind=tg_table_name and target_id=(to_jsonb(new)->>'id')::uuid) then
   raise exception '운영자가 숨긴 내용은 수정할 수 없습니다.' using errcode='42501';
 end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['publications','publication_comments','publication_likes','feature_requests','feature_votes','follows'] loop
   execute format('create trigger operator_community_guard before insert or update on public.%I for each row execute function admin_private.guard_community_write()',t);
 end loop;
end $$;

create or replace function public.operator_list(p_kind text,p_search text default '',p_status text default '',p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; source text; statement text; q text:=left(trim(coalesce(p_search,'')),200); off integer:=greatest(coalesce(p_offset,0),0);
begin
 perform admin_private.require_operator();
 if p_kind='dashboard' then
   return jsonb_build_object('users',(select count(*) from profiles),'posts',(select count(*) from publications),'tickets',(select count(*) from support_tickets),'reports',(select count(*) from content_reports),'restrictions',(select count(*) from admin_private.restrictions where until_at>now()));
 elsif p_kind='users' then
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
     select u.id,coalesce(p.display_name,'사용자') as display_name,p.lab_name,u.email,u.created_at,u.banned_until,r.until_at as restricted_until,r.reason,
       (select count(*) from publications where user_id=p.id) as post_count
     from auth.users u left join profiles p on p.id=u.id left join admin_private.restrictions r on r.user_id=u.id
     where q='' or u.id::text=q or p.display_name ilike '%'||q||'%' or u.email ilike '%'||q||'%'
     order by u.created_at desc,u.id limit 51 offset off
   ) x;
 elsif p_kind='audit' then
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (select * from admin_private.audit where q='' or target ilike '%'||q||'%' or reason ilike '%'||q||'%' order by id desc limit 51 offset off) x;
 elsif p_kind='restrictions' then
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (select r.*,p.display_name from admin_private.restrictions r left join profiles p on p.id=r.user_id where q='' or r.user_id::text=q or p.display_name ilike '%'||q||'%' order by updated_at desc limit 51 offset off) x;
 else
   source:=case p_kind when 'posts' then 'publications' when 'comments' then 'publication_comments' when 'reports' then 'content_reports' when 'bugs' then 'support_tickets' when 'legacy_bugs' then 'feature_requests' when 'security' then 'security_reports' when 'ideas' then 'feature_requests' when 'errors' then 'client_error_logs' when 'messages' then 'operator_messages' else null end;
   if source is null then raise exception '잘못된 목록입니다.'; end if;
   statement:=format('select coalesce(jsonb_agg(row),''[]''::jsonb) from (select to_jsonb(t)||jsonb_build_object(''case_status'',coalesce(s.status,''open''),''operator_note'',s.note,''hidden'',h.target_id is not null) as row from public.%I t left join admin_private.case_states s on s.kind=$1 and s.target_id::text=t.id::text left join admin_private.hidden_content h on h.kind=$2 and h.target_id::text=t.id::text where ($3='''' or to_jsonb(t)::text ilike ''%%''||$3||''%%'') and ($4='''' or coalesce(s.status,''open'')=$4)',source);
   if p_kind='legacy_bugs' then statement:=statement||' and t.title like ''[버그]%'''; end if;
   if p_kind='ideas' then statement:=statement||' and t.title not like ''[버그]%'''; end if;
   statement:=statement||' order by t.created_at desc,t.id desc limit 51 offset $5) r';
   execute statement into result using p_kind,source,q,coalesce(p_status,''),off;
 end if;
 return result;
end $$;

create or replace function public.operator_action(p_action text,p_payload jsonb,p_request uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid; v_kind text; v_source text; why text; until_time timestamptz; result jsonb; prior jsonb;
begin
 perform admin_private.require_operator();
 if p_request is null then raise exception '요청 ID가 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select detail->'result' into prior from admin_private.audit where detail->>'request_id'=p_request::text and actor=auth.uid();
 if found then return prior; end if;
 why:=trim(coalesce(p_payload->>'reason',''));
 if length(why)<2 or length(why)>2000 then raise exception '처리 이유를 2~2000자로 입력하세요.'; end if;
 target:=nullif(p_payload->>'id','')::uuid; v_kind:=p_payload->>'kind';
 if p_action in ('hide','restore') then
   if v_kind not in ('publications','publication_comments','feature_requests') or target is null then raise exception '대상이 올바르지 않습니다.'; end if;
   execute format('select to_jsonb(t) from public.%I t where id=$1',v_kind) into result using target;
   if result is null then raise exception '대상을 찾을 수 없습니다.'; end if;
   if p_action='hide' then insert into admin_private.hidden_content(kind,target_id,reason) values(v_kind,target,why) on conflict(kind,target_id) do update set reason=excluded.reason;
   else delete from admin_private.hidden_content where hidden_content.kind=v_kind and target_id=target; end if;
 elsif p_action='case' then
   if v_kind not in ('reports','bugs','legacy_bugs','security','ideas') or target is null then raise exception '대상이 올바르지 않습니다.'; end if;
   v_source:=case v_kind when 'reports' then 'content_reports' when 'bugs' then 'support_tickets' when 'security' then 'security_reports' else 'feature_requests' end;
   execute format('select to_jsonb(t) from public.%I t where id=$1',v_source) into result using target;
   if result is null then raise exception '대상을 찾을 수 없습니다.'; end if;
   insert into admin_private.case_states(kind,target_id,status,note) values(v_kind,target,p_payload->>'status',why) on conflict(kind,target_id) do update set status=excluded.status,note=excluded.note,updated_at=now();
 elsif p_action in ('restrict','unrestrict') then
   if target is null or exists(select 1 from admin_private.operators where user_id=target) then raise exception '운영자 계정은 제재할 수 없습니다.'; end if;
   if p_action='restrict' then
     until_time:=(p_payload->>'until')::timestamptz;
     if until_time is null or until_time<=now() then raise exception '종료 일시를 확인하세요.'; end if;
     insert into admin_private.restrictions(user_id,until_at,reason) values(target,until_time,why) on conflict(user_id) do update set until_at=excluded.until_at,reason=excluded.reason,updated_at=now();
   else delete from admin_private.restrictions where user_id=target; end if;
   insert into operator_messages(recipient_id,title,body) values(target,case when p_action='restrict' then '광장 이용 제한 안내' else '광장 이용 제한 해제 안내' end,why||case when until_time is not null then E'\n종료: '||until_time::text else '' end);
 elsif p_action='message' then
   if target is null and coalesce(p_payload->>'audience','')<>'all' then raise exception '수신 대상을 확인하세요.'; end if;
   insert into operator_messages(recipient_id,title,body) values(target,trim(p_payload->>'title'),trim(p_payload->>'body')) returning jsonb_build_object('id',id) into result;
 else raise exception '지원하지 않는 작업입니다.';
 end if;
 result:=coalesce(result,jsonb_build_object('ok',true));
 insert into admin_private.audit(actor,action,target,reason,detail) values(auth.uid(),p_action,coalesce(target::text,v_kind,'all'),why,jsonb_build_object('request_id',p_request,'kind',v_kind,'result',case when p_action in ('hide','restore') then jsonb_build_object('ok',true) else result end));
 return jsonb_build_object('ok',true);
end $$;

-- Keep original RPC signatures while filtering moderated content on every public entry point.
-- Private underlying routines are inaccessible to API roles; no RLS policy is loosened.
do $$ declare f record; call_args text; condition text; begin
 for f in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) identity_args,pg_get_function_arguments(p.oid) args,pg_get_function_result(p.oid) result_type
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('get_publication_feed','get_publication_feed_v2','get_publication_comments','get_publication_comments_v2','get_public_profile_publications','get_feature_feed') loop
   select string_agg(format('%I',a),',') into call_args from unnest((select proargnames[1:pronargs] from pg_proc where oid=f.oid)) a;
   condition:=case when f.proname like '%comments%' then 'not exists(select 1 from admin_private.hidden_content h where (h.kind=''publication_comments'' and h.target_id=r.id) or (h.kind=''publications'' and h.target_id=$1))'
     when f.proname='get_feature_feed' then 'not exists(select 1 from admin_private.hidden_content h where h.kind=''feature_requests'' and h.target_id=r.id) and r.title not like ''[버그]%'''
     else 'not exists(select 1 from admin_private.hidden_content h where h.kind=''publications'' and h.target_id=r.id)' end;
   execute format('alter function public.%I(%s) set schema admin_private',f.proname,f.identity_args);
   execute format('revoke all on function admin_private.%I(%s) from public,anon,authenticated',f.proname,f.identity_args);
   execute format('create function public.%I(%s) returns %s language sql security definer set search_path=public,pg_temp as $body$ select r.* from admin_private.%I(%s) r where %s $body$',f.proname,f.args,f.result_type,f.proname,call_args,condition);
   execute format('revoke all on function public.%I(%s) from public,anon,authenticated',f.proname,f.identity_args);
   execute format('grant execute on function public.%I(%s) to authenticated',f.proname,f.identity_args);
   if f.proname='get_public_profile_publications' then execute format('grant execute on function public.%I(%s) to anon',f.proname,f.identity_args); end if;
 end loop;
end $$;
revoke all on function public.operator_access(),public.operator_list(text,text,text,integer),public.operator_action(text,jsonb,uuid) from public,anon;
grant execute on function public.operator_access(),public.operator_list(text,text,text,integer),public.operator_action(text,jsonb,uuid) to authenticated;
revoke all on all functions in schema admin_private from public,anon,authenticated;
revoke all on all tables in schema admin_private from public,anon,authenticated;
alter table admin_private.operators enable row level security;
alter table admin_private.audit enable row level security;
alter table admin_private.restrictions enable row level security;
alter table admin_private.hidden_content enable row level security;
alter table admin_private.case_states enable row level security;
commit;
