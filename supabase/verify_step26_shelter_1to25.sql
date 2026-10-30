select jsonb_build_object(
  'profile_columns_ok', (
    select count(*) = 3
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name in ('active_title', 'unlocked_titles', 'shelter_play_count')
  ),
  'titles_not_null', (
    select is_nullable = 'NO'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'unlocked_titles'
  ),
  'table_ok', to_regclass('public.shelter_weekly_best') is not null,
  'rls_ok', (
    select relrowsecurity
    from pg_class
    where oid = 'public.shelter_weekly_best'::regclass
  ),
  'rank_index_ok', exists(
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'shelter_weekly_best_rank_idx'
  ),
  'before_reset_ok', public.current_shelter_week_key('2026-10-26 14:59:59+00'::timestamptz) = '2026-10-19'::date,
  'after_reset_ok', public.current_shelter_week_key('2026-10-26 15:00:00+00'::timestamptz) = '2026-10-26'::date,
  'record_rpc_ok', to_regprocedure('public.record_shelter_1to25(integer)') is not null,
  'leaderboard_rpc_ok', to_regprocedure('public.get_shelter_leaderboard()') is not null,
  'frames_rpc_ok', to_regprocedure('public.get_avatar_frames_v2(uuid[])') is not null,
  'export_ok', to_regprocedure('public.export_my_data()') is not null,
  'restore_ok', to_regprocedure('public.restore_my_data(jsonb)') is not null,
  'authenticated_record', has_function_privilege('authenticated', 'public.record_shelter_1to25(integer)', 'execute'),
  'authenticated_leaderboard', has_function_privilege('authenticated', 'public.get_shelter_leaderboard()', 'execute'),
  'anon_record_denied', not has_function_privilege('anon', 'public.record_shelter_1to25(integer)', 'execute'),
  'anon_leaderboard_denied', not has_function_privilege('anon', 'public.get_shelter_leaderboard()', 'execute'),
  'frames_include_title', pg_get_function_result('public.get_avatar_frames_v2(uuid[])'::regprocedure) like '%active_title%'
) as shelter_step26_verification;
