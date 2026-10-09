begin;
create function public.operator_user_history(p_user uuid,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;begin
 perform admin_private.require_operator();
 with history as (
 select 'audit:'||a.id id,'action' kind,a.action title,a.reason body,a.created_at from admin_private.audit a where a.target=p_user::text or a.target in (select id::text from publications where user_id=p_user union all select id::text from publication_comments where user_id=p_user)
 union all select 'report:'||r.id,'report',r.reason,coalesce(r.details,''),r.created_at from content_reports r where r.target_user_id=p_user or r.target_id in (select id from publications where user_id=p_user union all select id from publication_comments where user_id=p_user)
 union all select 'message:'||m.id,'message',m.title,m.body,m.created_at from operator_messages m where m.recipient_id=p_user
 ) select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (select * from history order by created_at desc,id desc limit 51 offset greatest(coalesce(p_offset,0),0))x;
 return result;
end $$;
revoke all on function public.operator_user_history(uuid,integer) from public,anon;
grant execute on function public.operator_user_history(uuid,integer) to authenticated;
commit;
