begin;
create table admin_private.case_replies (
 id uuid primary key default gen_random_uuid(), kind text not null, case_id uuid not null,
 recipient_id uuid references auth.users(id) on delete set null, actor uuid,
 body text not null check(length(body) between 1 and 4000), case_title text not null,
 request_id uuid not null unique, message_id uuid references public.operator_messages(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table admin_private.case_replies enable row level security;
revoke all on admin_private.case_replies from public,anon,authenticated;
create function public.operator_case_replies(p_kind text,p_id uuid,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; begin
 perform admin_private.require_operator();
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (select id,body,case_title,created_at from admin_private.case_replies where kind=p_kind and case_id=p_id order by created_at desc,id desc limit 51 offset greatest(coalesce(p_offset,0),0)) x;
 return result;
end $$;
create function public.operator_reply(p_kind text,p_id uuid,p_body text,p_request uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; recipient uuid; source text; mid uuid; prior uuid; title text;
begin
 perform admin_private.require_operator();
 if p_request is null or length(trim(coalesce(p_body,''))) not between 1 and 4000 then raise exception '답변을 1~4000자로 입력하세요.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into prior from admin_private.case_replies where request_id=p_request;
 if found then return jsonb_build_object('id',prior); end if;
 source:=case p_kind when 'bugs' then 'support_tickets' when 'contacts' then 'support_tickets' when 'legacy_bugs' then 'feature_requests' when 'reports' then 'content_reports' when 'security' then 'security_reports' when 'ideas' then 'feature_requests' end;
 if source is null then raise exception '지원하지 않는 제보입니다.'; end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1',source) into item using p_id;
 if item is null then raise exception '제보를 찾을 수 없습니다.'; end if;
 recipient:=coalesce(item->>'user_id',item->>'reporter_id')::uuid;
 if recipient is null or not exists(select 1 from auth.users where id=recipient) then raise exception '탈퇴한 사용자에게는 답변을 보낼 수 없습니다.'; end if;
 title:=coalesce(item->>'title',item->>'reason','접수한 신고');
 insert into public.operator_messages(recipient_id,title,body) values(recipient,left('제보 답변 · '||title,160),'문의: '||title||E'\n\n'||trim(p_body)) returning id into mid;
 insert into admin_private.case_replies(kind,case_id,recipient_id,actor,body,case_title,request_id,message_id) values(p_kind,p_id,recipient,auth.uid(),trim(p_body),title,p_request,mid) returning id into prior;
 insert into admin_private.audit(actor,action,target,reason,detail) values(auth.uid(),'reply',recipient::text,'제보 답변 발송',jsonb_build_object('kind',p_kind,'case_id',p_id,'reply_id',prior));
 return jsonb_build_object('id',prior);
end $$;
revoke all on function public.operator_case_replies(text,uuid,integer),public.operator_reply(text,uuid,text,uuid) from public,anon;
grant execute on function public.operator_case_replies(text,uuid,integer),public.operator_reply(text,uuid,text,uuid) to authenticated;
commit;
