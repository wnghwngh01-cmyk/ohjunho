begin;

-- 1 to 25 title thresholds. Keep these values aligned with js/shelter-ui.js.
-- master < 10,000ms, diamond < 13,000ms, gold < 17,000ms,
-- silver < 22,000ms, bronze on every clear, regular after 50 clears.

create or replace function public.current_shelter_week_key(p_now timestamptz default now())
returns date language sql stable set search_path=public,pg_temp as $$
  select date_trunc('week', (p_now at time zone 'Asia/Seoul') - interval '1 day')::date
$$;

create or replace function public.normalize_shelter_titles(value jsonb)
returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare
  allowed constant text[]:=array['master','diamond','gold','silver','bronze','regular','weekly_1st','weekly_2nd','weekly_3rd','weekly_top10'];
  result jsonb:='[]'::jsonb;
  code text;
begin
  if value is null then return result; end if;
  if jsonb_typeof(value)<>'array' then raise exception '칭호 목록 형식을 확인해 주세요.'; end if;
  for code in select jsonb_array_elements_text(value) loop
    if not (code=any(allowed)) then raise exception '알 수 없는 칭호입니다.'; end if;
    if not result ? code then result:=result||to_jsonb(code); end if;
  end loop;
  return result;
exception when invalid_parameter_value then
  raise exception '칭호 목록 형식을 확인해 주세요.';
end $$;

alter table public.profiles
  add column if not exists active_title text,
  add column if not exists unlocked_titles jsonb not null default '[]'::jsonb,
  add column if not exists shelter_play_count int not null default 0;

update public.profiles set unlocked_titles=public.normalize_shelter_titles(unlocked_titles);
alter table public.profiles drop constraint if exists profiles_active_title_check;
alter table public.profiles add constraint profiles_active_title_check check (
  active_title is null or active_title=any(array['master','diamond','gold','silver','bronze','regular','weekly_1st','weekly_2nd','weekly_3rd','weekly_top10'])
);
alter table public.profiles drop constraint if exists profiles_unlocked_titles_check;
alter table public.profiles add constraint profiles_unlocked_titles_check check (unlocked_titles=public.normalize_shelter_titles(unlocked_titles));
alter table public.profiles drop constraint if exists profiles_shelter_play_count_check;
alter table public.profiles add constraint profiles_shelter_play_count_check check (shelter_play_count>=0);

create table if not exists public.shelter_weekly_best(
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_key date not null,
  best_ms int not null check(best_ms>=3000 and best_ms<=600000),
  play_count int not null default 1 check(play_count>0),
  updated_at timestamptz not null default now(),
  primary key(week_key,user_id)
);
create index if not exists shelter_weekly_best_rank_idx on public.shelter_weekly_best(week_key,best_ms asc,updated_at asc);
alter table public.shelter_weekly_best enable row level security;
drop policy if exists shelter_weekly_best_select_own on public.shelter_weekly_best;
create policy shelter_weekly_best_select_own on public.shelter_weekly_best for select to authenticated using(user_id=auth.uid());
revoke all on public.shelter_weekly_best from anon;
grant select on public.shelter_weekly_best to authenticated;

create or replace function public.record_shelter_1to25(p_elapsed_ms int)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid();
  wk date:=public.current_shelter_week_key();
  old_titles jsonb;
  merged_titles jsonb;
  earned jsonb:='["bronze"]'::jsonb;
  new_titles jsonb;
  total_count int;
  best_value int;
  rank_value int;
  total_plays int;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  if p_elapsed_ms is null or p_elapsed_ms<3000 or p_elapsed_ms>600000 then raise exception '기록 범위를 확인해 주세요.'; end if;

  select unlocked_titles,shelter_play_count into old_titles,total_plays from public.profiles where id=u for update;
  if not found then raise exception '프로필을 찾을 수 없습니다.'; end if;
  total_plays:=total_plays+1;
  if p_elapsed_ms<22000 then earned:=earned||'"silver"'::jsonb; end if;
  if p_elapsed_ms<17000 then earned:=earned||'"gold"'::jsonb; end if;
  if p_elapsed_ms<13000 then earned:=earned||'"diamond"'::jsonb; end if;
  if p_elapsed_ms<10000 then earned:=earned||'"master"'::jsonb; end if;
  if total_plays>=50 then earned:=earned||'"regular"'::jsonb; end if;
  merged_titles:=public.normalize_shelter_titles(coalesce(old_titles,'[]'::jsonb)||earned);
  select coalesce(jsonb_agg(code),'[]'::jsonb) into new_titles
  from jsonb_array_elements(merged_titles) code where not coalesce(old_titles,'[]'::jsonb) ? (code#>>'{}');

  update public.profiles set unlocked_titles=merged_titles,shelter_play_count=total_plays where id=u;
  insert into public.shelter_weekly_best(user_id,week_key,best_ms,play_count)
  values(u,wk,p_elapsed_ms,1)
  on conflict(week_key,user_id) do update set
    best_ms=least(public.shelter_weekly_best.best_ms,excluded.best_ms),
    play_count=public.shelter_weekly_best.play_count+1,
    updated_at=case when excluded.best_ms<public.shelter_weekly_best.best_ms then now() else public.shelter_weekly_best.updated_at end;

  select best_ms into best_value from public.shelter_weekly_best where week_key=wk and user_id=u;
  select count(*)::int into total_count from public.shelter_weekly_best where week_key=wk;
  select ranked.position into rank_value from (
    select user_id,row_number() over(order by best_ms asc,updated_at asc,user_id asc)::int position
    from public.shelter_weekly_best where week_key=wk
  ) ranked where ranked.user_id=u;
  return jsonb_build_object('week_key',wk,'total_players',total_count,'my_rank',rank_value,'my_best_ms',best_value,'my_play_count',total_plays,'new_titles',new_titles);
end $$;

create or replace function public.get_shelter_leaderboard()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid();
  wk date:=public.current_shelter_week_key();
  top_rows jsonb;
  total_count int;
  rank_value int;
  best_value int;
  total_plays int;
  permanent jsonb;
  weekly_code text;
  available jsonb;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  with ranked as (
    select b.*,row_number() over(order by b.best_ms asc,b.updated_at asc,b.user_id asc)::int position
    from public.shelter_weekly_best b where b.week_key=wk
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',r.position,'user_id',r.user_id,'display_name',coalesce(p.display_name,'사용자'),'lab_name',coalesce(p.lab_name,'하루를 담다'),
    'avatar_path',p.avatar_path,'avatar_frame_tier',p.avatar_frame_tier,'avatar_frame_color',p.avatar_frame_color,
    'avatar_crown_color',p.avatar_crown_color,'active_title',p.active_title,'best_ms',r.best_ms
  ) order by r.position),'[]'::jsonb) into top_rows
  from ranked r join public.profiles p on p.id=r.user_id where r.position<=10;

  select count(*)::int into total_count from public.shelter_weekly_best where week_key=wk;
  select r.position,r.best_ms into rank_value,best_value from (
    select user_id,best_ms,row_number() over(order by best_ms asc,updated_at asc,user_id asc)::int position
    from public.shelter_weekly_best where week_key=wk
  ) r where r.user_id=u;
  select p.shelter_play_count,p.unlocked_titles into total_plays,permanent from public.profiles p where p.id=u;

  select case when min(position)=1 then 'weekly_1st' when min(position)=2 then 'weekly_2nd' when min(position)=3 then 'weekly_3rd' when min(position)<=10 then 'weekly_top10' end into weekly_code
  from (
    select ranked.position from (
      select user_id,row_number() over(partition by week_key order by best_ms asc,updated_at asc,user_id asc)::int position
      from public.shelter_weekly_best where week_key in(wk,wk-7)
    ) ranked where ranked.user_id=u
  ) mine;
  available:=public.normalize_shelter_titles(coalesce(permanent,'[]'::jsonb)||case when weekly_code is null then '[]'::jsonb else to_jsonb(weekly_code) end);
  return jsonb_build_object('week_key',wk,'top10',top_rows,'total_players',total_count,'my_rank',rank_value,'my_best_ms',best_value,'my_play_count',coalesce(total_plays,0),'available_titles',available);
end $$;

drop function if exists public.get_avatar_frames_v2(uuid[]);
create function public.get_avatar_frames_v2(p_ids uuid[])
returns table(id uuid,avatar_frame_tier text,avatar_frame_color text,avatar_crown_color text,active_title text)
language sql stable security definer set search_path=public,pg_temp as $$
  select p.id,p.avatar_frame_tier,p.avatar_frame_color,p.avatar_crown_color,p.active_title
  from public.profiles p
  where p.id=any(coalesce(p_ids,array[]::uuid[])) and (p.public_profile=true or p.id=auth.uid())
  limit 100
$$;

alter function public.export_my_data() rename to export_my_data_before_shelter;
revoke all on function public.export_my_data_before_shelter() from public,anon,authenticated;
create function public.export_my_data()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid();
  result jsonb;
  shelter_profile jsonb;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  result:=public.export_my_data_before_shelter();
  select jsonb_build_object('unlocked_titles',unlocked_titles,'active_title',active_title,'shelter_play_count',shelter_play_count) into shelter_profile from public.profiles where id=u;
  if result->'profiles'->0 is not null then result:=jsonb_set(result,'{profiles,0}',(result->'profiles'->0)||shelter_profile,true); end if;
  return result;
end $$;

alter function public.restore_my_data(jsonb) rename to restore_my_data_before_shelter;
revoke all on function public.restore_my_data_before_shelter(jsonb) from public,anon,authenticated;
create function public.restore_my_data(p_backup jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid();
  result jsonb;
  source jsonb:=p_backup->'profiles'->0;
  restored_titles jsonb;
  restored_active text;
  restored_count int;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  result:=public.restore_my_data_before_shelter(p_backup);
  if source is not null then
    restored_titles:=public.normalize_shelter_titles(coalesce(source->'unlocked_titles','[]'::jsonb));
    restored_active:=nullif(source->>'active_title','');
    if restored_active is not null and not (restored_active=any(array['master','diamond','gold','silver','bronze','regular','weekly_1st','weekly_2nd','weekly_3rd','weekly_top10'])) then restored_active:=null; end if;
    begin restored_count:=greatest(0,coalesce((source->>'shelter_play_count')::int,0)); exception when others then restored_count:=0; end;
    update public.profiles set
      unlocked_titles=public.normalize_shelter_titles(unlocked_titles||restored_titles),
      active_title=coalesce(restored_active,active_title),
      shelter_play_count=greatest(shelter_play_count,restored_count)
    where id=u;
  end if;
  return result;
end $$;

revoke all on function public.current_shelter_week_key(timestamptz),public.normalize_shelter_titles(jsonb),public.record_shelter_1to25(int),public.get_shelter_leaderboard(),public.get_avatar_frames_v2(uuid[]),public.export_my_data(),public.restore_my_data(jsonb) from public,anon;
grant execute on function public.current_shelter_week_key(timestamptz),public.normalize_shelter_titles(jsonb),public.record_shelter_1to25(int),public.get_shelter_leaderboard(),public.get_avatar_frames_v2(uuid[]),public.export_my_data(),public.restore_my_data(jsonb) to authenticated;
grant execute on function public.get_avatar_frames_v2(uuid[]) to anon;

commit;
