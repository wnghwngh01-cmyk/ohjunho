begin;

create table if not exists public.daily_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  todo_date date not null,
  title text not null check (char_length(title) between 1 and 120),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_todos_user_date_idx
  on public.daily_todos (user_id, todo_date, created_at);

alter table public.daily_todos enable row level security;

drop policy if exists daily_todos_owner_all on public.daily_todos;
create policy daily_todos_owner_all on public.daily_todos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.daily_todos to authenticated;

commit;
