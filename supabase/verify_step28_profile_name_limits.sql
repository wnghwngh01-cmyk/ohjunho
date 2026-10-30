select jsonb_build_object(
  'function_ok',to_regprocedure('public.enforce_profile_name_limits()') is not null,
  'trigger_ok',exists(
    select 1 from pg_trigger
    where tgname='profiles_name_limits'
      and tgrelid='public.profiles'::regclass
      and not tgisinternal
  ),
  'authenticated_direct_execute_denied',not has_function_privilege('authenticated','public.enforce_profile_name_limits()','execute')
) as profile_name_limits_verification;
