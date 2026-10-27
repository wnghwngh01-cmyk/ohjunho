begin;

create table public.workout_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,id)
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id uuid not null references public.workout_sections(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  memo text not null default '' check (length(memo) <= 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,id),
  unique(user_id,section_id,id),
  foreign key(user_id,section_id) references public.workout_sections(user_id,id) on delete cascade
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null check (set_number between 1 and 30),
  weight numeric(7,2) not null default 0 check (weight between 0 and 9999.99),
  reps integer not null default 0 check (reps between 0 and 9999),
  updated_at timestamptz not null default now(),
  unique(exercise_id,set_number),
  foreign key(user_id,exercise_id) references public.workout_exercises(user_id,id) on delete cascade
);

create table public.workout_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  sets jsonb not null check (jsonb_typeof(sets)='array' and jsonb_array_length(sets) between 1 and 30),
  memo text not null default '' check (length(memo) <= 500),
  created_at timestamptz not null default now(),
  foreign key(user_id,exercise_id) references public.workout_exercises(user_id,id) on delete cascade
);

create table public.protein_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null check (log_date between date '2000-01-01' and date '2100-12-31'),
  label text not null default '' check (length(label) <= 80),
  grams numeric(6,1) not null check (grams > 0 and grams <= 9999.9),
  created_at timestamptz not null default now()
);

create index workout_sections_user_sort on public.workout_sections(user_id,sort_order,created_at);
create index workout_exercises_section_sort on public.workout_exercises(section_id,sort_order,created_at);
create index workout_snapshots_exercise_created on public.workout_snapshots(exercise_id,created_at desc);
create index protein_logs_user_date on public.protein_logs(user_id,log_date,created_at);

alter table public.workout_sections enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_snapshots enable row level security;
alter table public.protein_logs enable row level security;

create policy workout_sections_own on public.workout_sections for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy workout_exercises_own on public.workout_exercises for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy workout_sets_own on public.workout_sets for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy workout_snapshots_own on public.workout_snapshots for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy protein_logs_own on public.protein_logs for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

grant select,insert,update,delete on public.workout_sections,public.workout_exercises,public.workout_sets,public.workout_snapshots,public.protein_logs to authenticated;
revoke all on public.workout_sections,public.workout_exercises,public.workout_sets,public.workout_snapshots,public.protein_logs from anon;

create function public.save_workout_exercise(p_exercise uuid,p_name text,p_memo text,p_sets jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); item jsonb; n integer:=0;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 80 or length(coalesce(p_memo,''))>500 then raise exception '운동 이름과 메모를 확인해 주세요.'; end if;
  if jsonb_typeof(p_sets)<>'array' or jsonb_array_length(p_sets) not between 1 and 30 then raise exception '세트는 1개 이상 30개 이하로 입력해 주세요.'; end if;
  if not exists(select 1 from workout_exercises where id=p_exercise and user_id=u) then raise exception '운동을 찾을 수 없습니다.'; end if;
  for item in select value from jsonb_array_elements(p_sets) loop
    n:=n+1;
    if jsonb_typeof(item)<>'object' or coalesce((item->>'weight')::numeric,-1) not between 0 and 9999.99 or coalesce((item->>'reps')::integer,-1) not between 0 and 9999 then raise exception '무게와 횟수를 확인해 주세요.'; end if;
  end loop;
  update workout_exercises set name=trim(p_name),memo=coalesce(p_memo,''),updated_at=now() where id=p_exercise and user_id=u;
  delete from workout_sets where exercise_id=p_exercise and user_id=u;
  insert into workout_sets(user_id,exercise_id,set_number,weight,reps)
    select u,p_exercise,ord,(x->>'weight')::numeric,(x->>'reps')::integer from jsonb_array_elements(p_sets) with ordinality a(x,ord);
  insert into workout_snapshots(user_id,exercise_id,sets,memo) values(u,p_exercise,p_sets,coalesce(p_memo,''));
  return jsonb_build_object('saved',true,'sets',jsonb_array_length(p_sets));
end $$;
revoke all on function public.save_workout_exercise(uuid,text,text,jsonb) from public,anon;
grant execute on function public.save_workout_exercise(uuid,text,text,jsonb) to authenticated;

commit;
