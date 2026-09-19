begin;

-- RLS 때문에 클라이언트가 직접 읽을 수 없는 비공개 신고 자료까지
-- 현재 로그인한 사용자의 데이터만 한 번에 내보낸다.
create or replace function public.export_my_data()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'version', 3,
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
