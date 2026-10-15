-- Apply only after rule/worker tests and explicit server authorization.
-- No existing cron jobs are altered. The worker has a test-account allowlist.
create extension if not exists pg_cron;
select cron.schedule('haru-recurring-finance-v1','*/5 * * * *','select public.run_recurring_finance();');
