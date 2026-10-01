begin;

alter table public.events
  add column if not exists color_key text not null default 'forest';

alter table public.events
  drop constraint if exists events_color_key_check;

alter table public.events
  add constraint events_color_key_check
  check (color_key in ('forest', 'sage', 'blue', 'amber', 'rose', 'violet'));

comment on column public.events.color_key is
  'Calendar palette key. The client maps this allowlisted key to accessible light-theme colors.';

commit;
