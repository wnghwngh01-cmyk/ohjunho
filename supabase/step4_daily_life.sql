begin;

alter table public.events
  add column if not exists important boolean not null default false;

create index if not exists events_user_important_date_idx
  on public.events (user_id, important, start_date)
  where important = true;

commit;
