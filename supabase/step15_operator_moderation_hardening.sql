begin;
-- Restrictive policies preserve all existing ownership/audience policies.
create function public.operator_content_visible(p_kind text,p_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select not exists(select 1 from admin_private.hidden_content where kind=p_kind and target_id=p_id)
$$;
revoke all on function public.operator_content_visible(text,uuid) from public;
grant execute on function public.operator_content_visible(text,uuid) to anon,authenticated;
create policy operator_hide_publication on public.publications as restrictive for select to anon,authenticated using(public.operator_content_visible('publications',id));
create policy operator_hide_comment on public.publication_comments as restrictive for select to anon,authenticated using(public.operator_content_visible('publication_comments',id) and public.operator_content_visible('publications',publication_id));
create policy operator_hide_feature on public.feature_requests as restrictive for select to anon,authenticated using(public.operator_content_visible('feature_requests',id) and title not like '[버그]%');

create table admin_private.report_snapshots(report_id uuid primary key,snapshot jsonb not null,created_at timestamptz not null default now());
create function admin_private.capture_report()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare content jsonb;
begin
 if new.target_type in ('publication','post','record','diary','book','community') then
   select to_jsonb(p) into content from public.publications p where p.id=new.target_id;
 elsif new.target_type in ('comment','reply') then
   select to_jsonb(c) into content from public.publication_comments c where c.id=new.target_id;
 end if;
 insert into admin_private.report_snapshots(report_id,snapshot) values(new.id,jsonb_build_object('report',to_jsonb(new),'content',content));
 return new;
end $$;
create trigger operator_report_snapshot after insert on public.content_reports for each row execute function admin_private.capture_report();
create function public.operator_report_snapshot(p_report uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 perform admin_private.require_operator();
 select snapshot into result from admin_private.report_snapshots where report_id=p_report;
 return result;
end $$;
create function admin_private.limit_support_tickets()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,1));
 if (select count(*) from public.support_tickets where user_id=new.user_id and created_at>now()-interval '1 hour')>=10 then raise exception '제보는 한 시간에 10건까지 보낼 수 있습니다.'; end if;
 return new;
end $$;
create trigger support_ticket_limit before insert on public.support_tickets for each row execute function admin_private.limit_support_tickets();
create index support_tickets_created_idx on public.support_tickets(created_at desc);
create index operator_messages_recipient_idx on public.operator_messages(recipient_id,created_at desc);
create index operator_audit_created_idx on admin_private.audit(created_at desc);
revoke all on function public.operator_report_snapshot(uuid) from public,anon;
grant execute on function public.operator_report_snapshot(uuid) to authenticated;
revoke all on all functions in schema admin_private from public,anon,authenticated;
revoke all on all tables in schema admin_private from public,anon,authenticated;
alter table admin_private.report_snapshots enable row level security;
commit;
