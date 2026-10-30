select jsonb_build_object(
  'settlements_table',to_regclass('public.shelter_weekly_settlements') is not null,
  'settlements_rls',(select relrowsecurity from pg_class where oid='public.shelter_weekly_settlements'::regclass),
  'settle_rpc',to_regprocedure('public.settle_shelter_weekly_titles(timestamptz)') is not null,
  'record_rpc',to_regprocedure('public.record_shelter_1to25(integer)') is not null,
  'leaderboard_rpc',to_regprocedure('public.get_shelter_leaderboard(timestamptz)') is not null,
  'old_leaderboard_removed',to_regprocedure('public.get_shelter_leaderboard()') is null,
  'authenticated_settle_denied',not has_function_privilege('authenticated','public.settle_shelter_weekly_titles(timestamptz)','execute'),
  'authenticated_record',has_function_privilege('authenticated','public.record_shelter_1to25(integer)','execute'),
  'authenticated_leaderboard',has_function_privilege('authenticated','public.get_shelter_leaderboard(timestamptz)','execute'),
  'active_requires_owned',exists(
    select 1 from pg_constraint
    where conname='profiles_active_title_check'
      and pg_get_constraintdef(oid) like '%unlocked_titles ? active_title%'
  ),
  'frames_all_profiles',position('p.public_profile' in pg_get_functiondef('public.get_avatar_frames_v2(uuid[])'::regprocedure))=0,
  'frames_validate_title',position('unlocked_titles ? p.active_title' in pg_get_functiondef('public.get_avatar_frames_v2(uuid[])'::regprocedure))>0,
  'cron_job_ok',not exists(select 1 from pg_extension where extname='pg_cron') or exists(
    select 1 from cron.job
    where jobname='settle-shelter-weekly-titles'
      and schedule='0 15 * * 1'
      and command='select public.settle_shelter_weekly_titles();'
  )
) as shelter_step27_verification;
