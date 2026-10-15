-- Apply after the test-account scheduled run succeeds. Only explicitly saved
-- active rules are processed; existing ordinary transactions are never converted.
create or replace function public.run_recurring_finance() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; ok integer:=0; failed integer:=0;
begin
 for r in select x.id from finance_recurring_rules x where x.status='active' and x.next_due<=(now() at time zone x.timezone)::date order by x.id for update of x skip locked loop
  if process_recurring_rule(r.id,now()) then ok:=ok+1;else failed:=failed+1;end if;
 end loop;
 return jsonb_build_object('processed_rules',ok,'failed_rules',failed);
end $$;
revoke all on function public.run_recurring_finance() from public,anon,authenticated;
