-- Transient verification for step 8 client error logging.
-- Requires the two disposable test accounts below. All inserted rows are rolled
-- back inside the exception block before the result is returned.

create or replace function pg_temp.verify_step8_error_logging()
returns jsonb
language plpgsql
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_first_a boolean;
  v_duplicate_a boolean;
  v_first_b boolean;
  v_export_a integer;
  v_export_b integer;
  v_stored_total integer;
  v_distinct_users integer;
  v_fingerprint text := 'stage8-shared-fingerprint-20260921';
begin
  select id into v_user_a from auth.users where email = 'lab-a@test.local';
  select id into v_user_b from auth.users where email = 'lab-b@test.local';

  if v_user_a is null or v_user_b is null then
    raise exception 'Required test accounts are missing';
  end if;

  begin
    perform set_config('request.jwt.claim.sub', v_user_a::text, true);
    v_first_a := public.log_client_error(
      'stage8-dynamic-check', 'TEST_ONLY', '[email] [token]',
      v_fingerprint, '/stage8-check', 8, true
    );
    v_duplicate_a := public.log_client_error(
      'stage8-dynamic-check', 'TEST_ONLY', '[email] [token]',
      v_fingerprint, '/stage8-check', 8, true
    );
    select count(*) into v_export_a
      from jsonb_array_elements(public.export_my_error_logs()) item
      where item->>'fingerprint' = v_fingerprint;

    perform set_config('request.jwt.claim.sub', v_user_b::text, true);
    v_first_b := public.log_client_error(
      'stage8-dynamic-check', 'TEST_ONLY', '[email] [token]',
      v_fingerprint, '/stage8-check', 8, true
    );
    select count(*) into v_export_b
      from jsonb_array_elements(public.export_my_error_logs()) item
      where item->>'fingerprint' = v_fingerprint;

    select count(*), count(distinct user_id)
      into v_stored_total, v_distinct_users
      from public.client_error_logs
      where fingerprint = v_fingerprint;

    raise exception using
      errcode = 'PT001',
      message = 'rollback transient verification data';
  exception when sqlstate 'PT001' then
    null;
  end;

  return jsonb_build_object(
    'test1_first_insert', v_first_a,
    'test1_duplicate_blocked', not v_duplicate_a,
    'test1_export_own_count', v_export_a,
    'test2_same_fingerprint_insert', v_first_b,
    'test2_export_own_count', v_export_b,
    'stored_before_rollback', v_stored_total,
    'distinct_users_before_rollback', v_distinct_users,
    'remaining_after_rollback', (
      select count(*) from public.client_error_logs
      where fingerprint = v_fingerprint
    ),
    'authenticated_direct_select', has_table_privilege(
      'authenticated', 'public.client_error_logs', 'SELECT'
    ),
    'authenticated_direct_insert', has_table_privilege(
      'authenticated', 'public.client_error_logs', 'INSERT'
    ),
    'anon_direct_select', has_table_privilege(
      'anon', 'public.client_error_logs', 'SELECT'
    ),
    'anon_direct_insert', has_table_privilege(
      'anon', 'public.client_error_logs', 'INSERT'
    ),
    'authenticated_rpc_execute', has_function_privilege(
      'authenticated',
      'public.log_client_error(text,text,text,text,text,integer,boolean)',
      'EXECUTE'
    ),
    'anon_rpc_execute', has_function_privilege(
      'anon',
      'public.log_client_error(text,text,text,text,text,integer,boolean)',
      'EXECUTE'
    )
  );
end
$$;

select pg_temp.verify_step8_error_logging() as verification;
