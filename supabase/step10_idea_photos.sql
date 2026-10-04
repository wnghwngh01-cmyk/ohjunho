begin;

create unique index if not exists ideas_id_user_id_uidx
  on public.ideas(id,user_id);

create table if not exists public.idea_media (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null,
  user_id uuid not null,
  storage_path text not null,
  original_name text not null default '',
  mime_type text,
  size_bytes bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint idea_media_idea_user_fk foreign key (idea_id,user_id)
    references public.ideas(id,user_id) on delete cascade
);

create index if not exists idea_media_owner_idea_order_idx
  on public.idea_media(user_id,idea_id,sort_order,created_at);

alter table public.idea_media enable row level security;
revoke all on table public.idea_media from public,anon;
grant select,insert,update,delete on table public.idea_media to authenticated;

drop policy if exists idea_media_select_own on public.idea_media;
create policy idea_media_select_own on public.idea_media
  for select to authenticated using (user_id=auth.uid());

drop policy if exists idea_media_insert_own on public.idea_media;
create policy idea_media_insert_own on public.idea_media
  for insert to authenticated with check (user_id=auth.uid());

drop policy if exists idea_media_update_own on public.idea_media;
create policy idea_media_update_own on public.idea_media
  for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists idea_media_delete_own on public.idea_media;
create policy idea_media_delete_own on public.idea_media
  for delete to authenticated using (user_id=auth.uid());

create or replace function public.export_my_data()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'version', 4,
    'profiles', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.profiles where id=auth.uid()) x), '[]'::jsonb),
    'records', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.records where user_id=auth.uid()) x), '[]'::jsonb),
    'record_media', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.record_media where user_id=auth.uid()) x), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.events where user_id=auth.uid()) x), '[]'::jsonb),
    'daily_todos', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.daily_todos where user_id=auth.uid()) x), '[]'::jsonb),
    'habits', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.habits where user_id=auth.uid()) x), '[]'::jsonb),
    'habit_checks', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.habit_checks where user_id=auth.uid()) x), '[]'::jsonb),
    'goals', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.goals where user_id=auth.uid()) x), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.projects where user_id=auth.uid()) x), '[]'::jsonb),
    'project_files', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.project_files where user_id=auth.uid()) x), '[]'::jsonb),
    'ideas', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.ideas where user_id=auth.uid()) x), '[]'::jsonb),
    'idea_media', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.idea_media where user_id=auth.uid()) x), '[]'::jsonb),
    'works', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.works where user_id=auth.uid()) x), '[]'::jsonb),
    'finance_transactions', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.finance_transactions where user_id=auth.uid()) x), '[]'::jsonb),
    'publications', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.publications where user_id=auth.uid()) x), '[]'::jsonb),
    'follows', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.follows where follower_id=auth.uid()) x), '[]'::jsonb),
    'publication_likes', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.publication_likes where user_id=auth.uid()) x), '[]'::jsonb),
    'publication_comments', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.publication_comments where user_id=auth.uid()) x), '[]'::jsonb),
    'blocks', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.blocks where blocker_id=auth.uid()) x), '[]'::jsonb),
    'feature_requests', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.feature_requests where user_id=auth.uid()) x), '[]'::jsonb),
    'feature_votes', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.feature_votes where user_id=auth.uid()) x), '[]'::jsonb),
    'content_reports', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.content_reports where reporter_id=auth.uid()) x), '[]'::jsonb),
    'security_reports', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.security_reports where user_id=auth.uid()) x), '[]'::jsonb),
    'legacy_site_state', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.site_state where user_id=auth.uid()) x), '[]'::jsonb)
  );
$$;

revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;

commit;
