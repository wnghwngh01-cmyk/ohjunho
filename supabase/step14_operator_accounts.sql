begin;
create table admin_private.account_blocks(user_id uuid primary key references auth.users(id) on delete cascade,until_at timestamptz not null,reason text not null);
create or replace function public.check_operator_account_access()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is not null and exists(select 1 from admin_private.account_blocks where user_id=auth.uid() and until_at>now()) then
  raise exception '이용이 정지된 계정입니다.' using errcode='42501';
 end if;
end $$;
-- Abort rather than silently replace an existing request hook.
do $$ declare setting text; begin
 select split_part(v,'=',2) into setting from pg_roles r cross join lateral unnest(r.rolconfig) v where r.rolname='authenticator' and v like 'pgrst.db_pre_request=%';
 if setting is not null and setting<>'' and setting<>'public.check_operator_account_access' then raise exception '기존 PostgREST hook을 먼저 검토하세요: %',setting; end if;
end $$;
alter role authenticator set pgrst.db_pre_request='public.check_operator_account_access';
notify pgrst,'reload config';

create or replace function public.operator_account_prepare(p_target uuid,p_action text,p_reason text)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare operation bigint;
begin
 perform admin_private.require_operator();
 if p_target is null or p_action not in ('ban','permanent_ban','unban','delete') or length(trim(p_reason)) not between 2 and 2000 then raise exception '계정 조치 입력을 확인하세요.'; end if;
 if exists(select 1 from admin_private.operators where user_id=p_target) then raise exception '운영자 계정은 변경할 수 없습니다.'; end if;
 if not exists(select 1 from auth.users where id=p_target) then raise exception '계정을 찾을 수 없습니다.'; end if;
 insert into admin_private.audit(actor,action,target,reason,detail) values(auth.uid(),'account_'||p_action,p_target::text,p_reason,'{"status":"started"}') returning id into operation;
 if p_action in ('ban','permanent_ban','delete') then insert into admin_private.account_blocks values(p_target,case when p_action in ('delete','permanent_ban') then 'infinity'::timestamptz else now()+interval '7 days' end,p_reason) on conflict(user_id) do update set until_at=excluded.until_at,reason=excluded.reason; end if;
 return operation;
end $$;
create or replace function public.operator_account_finish(p_operation bigint,p_ok boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare row admin_private.audit;
begin
 select * into row from admin_private.audit where id=p_operation for update;
 if not found or row.action not in ('account_ban','account_permanent_ban','account_unban','account_delete') then raise exception '작업을 찾을 수 없습니다.'; end if;
 if p_ok and row.action='account_unban' then delete from admin_private.account_blocks where user_id=row.target::uuid; end if;
 update admin_private.audit set detail=jsonb_build_object('status',case when p_ok then 'completed' else 'failed_retry_required' end) where id=p_operation;
end $$;
create or replace function public.operator_storage_allowed()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select not exists(select 1 from admin_private.account_blocks where user_id=auth.uid() and until_at>now())
$$;
create policy operator_block_storage on storage.objects as restrictive for all to authenticated using(public.operator_storage_allowed()) with check(public.operator_storage_allowed());
revoke all on function public.operator_account_prepare(uuid,text,text),public.operator_account_finish(bigint,boolean) from public,anon,authenticated;
grant execute on function public.operator_account_prepare(uuid,text,text) to authenticated;
grant execute on function public.operator_account_finish(bigint,boolean) to service_role;
revoke all on function public.check_operator_account_access(),public.operator_storage_allowed() from public;
grant execute on function public.check_operator_account_access() to anon,authenticated,service_role;
grant execute on function public.operator_storage_allowed() to authenticated;
alter table admin_private.account_blocks enable row level security;
commit;
