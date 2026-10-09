begin;
alter table public.support_tickets add column category text not null default 'bug' check(category in ('bug','contact'));
create or replace function public.operator_list(p_kind text,p_search text default '',p_status text default '',p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; source text; statement text; q text:=left(trim(coalesce(p_search,'')),200); off integer:=greatest(coalesce(p_offset,0),0);
begin
 perform admin_private.require_operator();
 if p_kind='dashboard' then
   return jsonb_build_object('users',(select count(*) from profiles),'posts',(select count(*) from publications),'tickets',((select count(*) from support_tickets where category='bug')+(select count(*) from feature_requests where title like '[버그]%')),'contacts',(select count(*) from support_tickets where category='contact'),'reports',(select count(*) from content_reports),'restrictions',(select count(*) from admin_private.restrictions where until_at>now()));
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
   source:=case p_kind when 'posts' then 'publications' when 'comments' then 'publication_comments' when 'reports' then 'content_reports' when 'bugs' then 'support_tickets' when 'contacts' then 'support_tickets' when 'legacy_bugs' then 'feature_requests' when 'security' then 'security_reports' when 'ideas' then 'feature_requests' when 'errors' then 'client_error_logs' when 'messages' then 'operator_messages' else null end;
   if source is null then raise exception '잘못된 목록입니다.'; end if;
   statement:=format('select coalesce(jsonb_agg(row),''[]''::jsonb) from (select to_jsonb(t)||jsonb_build_object(''case_status'',coalesce(s.status,''open''),''operator_note'',s.note,''hidden'',h.target_id is not null) as row from public.%I t left join admin_private.case_states s on s.kind=$1 and s.target_id::text=t.id::text left join admin_private.hidden_content h on h.kind=$2 and h.target_id::text=t.id::text where ($3='''' or to_jsonb(t)::text ilike ''%%''||$3||''%%'') and ($4='''' or coalesce(s.status,''open'')=$4)',source);
   if p_kind='bugs' then statement:=statement||' and t.category=''bug'''; end if;
   if p_kind='contacts' then statement:=statement||' and t.category=''contact'''; end if;
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
   if v_kind not in ('reports','bugs','contacts','legacy_bugs','security','ideas') or target is null then raise exception '대상이 올바르지 않습니다.'; end if;
   v_source:=case v_kind when 'reports' then 'content_reports' when 'bugs' then 'support_tickets' when 'contacts' then 'support_tickets' when 'security' then 'security_reports' else 'feature_requests' end;
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


create function public.my_support_replies(p_id uuid,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; begin
 if auth.uid() is null or not exists(select 1 from public.support_tickets where id=p_id and user_id=auth.uid()) then raise exception '본인의 문의만 확인할 수 있습니다.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (select body,created_at from admin_private.case_replies where case_id=p_id and kind in ('bugs','contacts') and recipient_id=auth.uid() order by created_at desc,id desc limit 51 offset greatest(coalesce(p_offset,0),0)) x;
 return result;
end $$;
revoke all on function public.my_support_replies(uuid,integer) from public,anon;
grant execute on function public.my_support_replies(uuid,integer) to authenticated;

commit;
