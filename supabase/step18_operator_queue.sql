begin;
create function public.operator_queue()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 perform admin_private.require_operator();
 with cases as (
 select case when category='contact' then 'contacts' else 'bugs' end kind,id,user_id,title,body,created_at from support_tickets
 union all select 'legacy_bugs',id,user_id,title,body,created_at from feature_requests where title like '[버그]%'
 union all select 'reports',id,reporter_id,reason,details,created_at from content_reports
 ), pending as (
 select c.*,coalesce(s.status,'open') case_status from cases c left join admin_private.case_states s on s.kind=c.kind and s.target_id=c.id where coalesce(s.status,'open') not in ('resolved','dismissed')
 ) select jsonb_build_object('bugs',(select count(*) from pending where kind in ('bugs','legacy_bugs')),'contacts',(select count(*) from pending where kind='contacts'),'reports',(select count(*) from pending where kind='reports'),'recent',coalesce((select jsonb_agg(to_jsonb(x)||coalesce((select to_jsonb(r) from content_reports r where r.id=x.id and x.kind='reports'),'{}'::jsonb)) from (select * from pending order by created_at desc,id desc limit 8)x),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.operator_queue() from public,anon;
grant execute on function public.operator_queue() to authenticated;
commit;
