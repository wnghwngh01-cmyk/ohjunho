begin;

create table if not exists public.notification_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null check (length(notification_key) between 3 and 160),
  read_at timestamptz,
  dismissed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

alter table public.notification_states enable row level security;
revoke all on public.notification_states from public, anon;
grant select, insert, update, delete on public.notification_states to authenticated;

drop policy if exists notification_states_select_own on public.notification_states;
create policy notification_states_select_own on public.notification_states
  for select to authenticated using (user_id = auth.uid());
drop policy if exists notification_states_insert_own on public.notification_states;
create policy notification_states_insert_own on public.notification_states
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists notification_states_update_own on public.notification_states;
create policy notification_states_update_own on public.notification_states
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notification_states_delete_own on public.notification_states;
create policy notification_states_delete_own on public.notification_states
  for delete to authenticated using (user_id = auth.uid());

create index if not exists notification_states_user_updated_idx
  on public.notification_states(user_id, updated_at desc);

create or replace function public.get_my_activity_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]'::jsonb)
    into result
  from (
    select
      'comment:' || c.id::text as notification_key,
      'comment'::text as kind,
      c.id::text as source_id,
      c.publication_id,
      null::uuid as contact_id,
      '💬 소소한 광장 새 댓글'::text as title,
      left(coalesce(pr.display_name, '사용자') || '님이 회원님의 게시글에 댓글을 남겼습니다: ' || c.body, 240) as body,
      c.created_at,
      (ns.read_at is not null) as read,
      (ns.dismissed_at is not null) as dismissed
    from public.publication_comments c
    join public.publications p on p.id = c.publication_id and p.user_id = auth.uid()
    left join public.profiles pr on pr.id = c.user_id
    left join public.notification_states ns
      on ns.user_id = auth.uid() and ns.notification_key = 'comment:' || c.id::text
    where c.user_id <> auth.uid()
      and c.created_at >= now() - interval '7 days'
      and public.operator_content_visible('publication_comments', c.id)
      and public.operator_content_visible('publications', p.id)

    union all

    select
      'support:' || r.id::text as notification_key,
      'support_reply'::text as kind,
      r.id::text as source_id,
      null::uuid as publication_id,
      r.case_id as contact_id,
      '운영자 문의 답변'::text as title,
      left(r.body, 240) as body,
      r.created_at,
      (ns.read_at is not null) as read,
      (ns.dismissed_at is not null) as dismissed
    from admin_private.case_replies r
    join public.support_tickets t on t.id = r.case_id and t.user_id = auth.uid()
    left join public.notification_states ns
      on ns.user_id = auth.uid() and ns.notification_key = 'support:' || r.id::text
    where r.recipient_id = auth.uid()
      and r.kind = 'contacts'
      and r.created_at >= now() - interval '90 days'
  ) n;
  return result;
end;
$$;

create or replace function public.mark_my_notification(
  p_key text,
  p_dismiss boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_key, ''))) not between 3 and 160 then
    raise exception '알림 키가 올바르지 않습니다.';
  end if;
  insert into public.notification_states(user_id, notification_key, read_at, dismissed_at)
  values(auth.uid(), trim(p_key), now(), case when p_dismiss then now() else null end)
  on conflict (user_id, notification_key) do update
    set read_at = coalesce(public.notification_states.read_at, excluded.read_at),
        dismissed_at = case when p_dismiss then now() else public.notification_states.dismissed_at end,
        updated_at = now();
end;
$$;

create or replace function public.mark_all_my_activity_notifications_read()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare item record;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;
  for item in
    select 'comment:' || c.id::text as notification_key
    from public.publication_comments c
    join public.publications p on p.id = c.publication_id and p.user_id = auth.uid()
    where c.user_id <> auth.uid() and c.created_at >= now() - interval '7 days'
    union all
    select 'support:' || r.id::text
    from admin_private.case_replies r
    join public.support_tickets t on t.id = r.case_id and t.user_id = auth.uid()
    where r.recipient_id = auth.uid() and r.kind = 'contacts' and r.created_at >= now() - interval '90 days'
  loop
    insert into public.notification_states(user_id, notification_key, read_at)
    values(auth.uid(), item.notification_key, now())
    on conflict (user_id, notification_key) do update
      set read_at = coalesce(public.notification_states.read_at, excluded.read_at), updated_at = now();
  end loop;
end;
$$;

revoke all on function public.get_my_activity_notifications(), public.mark_my_notification(text, boolean), public.mark_all_my_activity_notifications_read() from public, anon;
grant execute on function public.get_my_activity_notifications(), public.mark_my_notification(text, boolean), public.mark_all_my_activity_notifications_read() to authenticated;

commit;
