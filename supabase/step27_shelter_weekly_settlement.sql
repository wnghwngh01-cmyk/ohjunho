begin;

-- 1 to 25 titles are awarded only after a weekly season closes.
-- A season closes every Monday 24:00 (Tuesday 00:00 Asia/Seoul).
-- Keep tier thresholds aligned with js/shelter-ui.js.

create table if not exists public.shelter_weekly_settlements(
  week_key date primary key,
  settled_at timestamptz not null default now()
);
alter table public.shelter_weekly_settlements enable row level security;
revoke all on public.shelter_weekly_settlements from public,anon,authenticated;

update public.profiles
set active_title=null
where active_title is not null
  and not unlocked_titles ? active_title;

alter table public.profiles drop constraint if exists profiles_active_title_check;
alter table public.profiles add constraint profiles_active_title_check check (
  active_title is null or unlocked_titles ? active_title
);

create or replace function public.settle_shelter_weekly_titles(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  current_week date:=public.current_shelter_week_key(p_now);
  last_week date:=current_week-7;
  start_week date;
  target_week date;
  participant record;
  earned jsonb;
  weekly_code text;
  settled_weeks jsonb:='[]'::jsonb;
  previous_weekly_active jsonb;
  weekly_codes constant text[]:=array['weekly_1st','weekly_2nd','weekly_3rd','weekly_top10'];
begin
  select max(week_key)+7 into start_week from public.shelter_weekly_settlements;
  if start_week is null then
    select coalesce(min(week_key),last_week) into start_week
    from public.shelter_weekly_best
    where week_key<=last_week;
  end if;
  start_week:=coalesce(start_week,last_week);

  for target_week in
    select generated::date
    from generate_series(start_week,last_week,interval '7 days') generated
    order by generated
  loop
    insert into public.shelter_weekly_settlements(week_key)
    values(target_week)
    on conflict(week_key) do nothing;
    if not found then continue; end if;

    select coalesce(jsonb_object_agg(id::text,active_title),'{}'::jsonb) into previous_weekly_active
    from public.profiles
    where active_title=any(weekly_codes);
    update public.profiles set active_title=null where active_title=any(weekly_codes);

    update public.profiles p
    set unlocked_titles=public.normalize_shelter_titles(coalesce((
      select jsonb_agg(to_jsonb(title_code))
      from jsonb_array_elements_text(p.unlocked_titles) as owned(title_code)
      where not title_code=any(weekly_codes)
    ),'[]'::jsonb));

    for participant in
      select ranked.user_id,ranked.best_ms,ranked.position,p.shelter_play_count
      from (
        select b.user_id,b.best_ms,
          row_number() over(order by b.best_ms asc,b.updated_at asc,b.user_id asc)::int as position
        from public.shelter_weekly_best b
        where b.week_key=target_week
      ) ranked
      join public.profiles p on p.id=ranked.user_id
      order by ranked.position
    loop
      earned:='["bronze"]'::jsonb;
      if participant.best_ms<22000 then earned:=earned||to_jsonb('silver'::text); end if;
      if participant.best_ms<17000 then earned:=earned||to_jsonb('gold'::text); end if;
      if participant.best_ms<13000 then earned:=earned||to_jsonb('diamond'::text); end if;
      if participant.best_ms<10000 then earned:=earned||to_jsonb('master'::text); end if;
      if participant.shelter_play_count>=50 then earned:=earned||to_jsonb('regular'::text); end if;
      weekly_code:=case
        when participant.position=1 then 'weekly_1st'
        when participant.position=2 then 'weekly_2nd'
        when participant.position=3 then 'weekly_3rd'
        when participant.position between 4 and 10 then 'weekly_top10'
        else null
      end;
      if weekly_code is not null then earned:=earned||to_jsonb(weekly_code); end if;
      update public.profiles
      set unlocked_titles=public.normalize_shelter_titles(unlocked_titles||earned)
      where id=participant.user_id;
    end loop;

    update public.profiles p
    set active_title=previous_weekly_active->>p.id::text
    where previous_weekly_active ? p.id::text
      and p.unlocked_titles ? (previous_weekly_active->>p.id::text);
    update public.profiles
    set active_title=null
    where active_title is not null
      and not unlocked_titles ? active_title;
    settled_weeks:=settled_weeks||to_jsonb(target_week);
  end loop;

  return jsonb_build_object('settled_weeks',settled_weeks,'settled_count',jsonb_array_length(settled_weeks));
end $$;

create or replace function public.record_shelter_1to25(p_elapsed_ms int)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  call_now timestamptz:=now();
  u uuid:=auth.uid();
  wk date:=public.current_shelter_week_key(call_now);
  total_count int;
  best_value int;
  rank_value int;
  total_plays int;
  expected_grade text;
begin
  perform public.settle_shelter_weekly_titles(call_now);
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  if p_elapsed_ms is null or p_elapsed_ms<3000 or p_elapsed_ms>600000 then raise exception '기록 범위를 확인해 주세요.'; end if;

  update public.profiles
  set shelter_play_count=shelter_play_count+1
  where id=u
  returning shelter_play_count into total_plays;
  if not found then raise exception '프로필을 찾을 수 없습니다.'; end if;

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
  expected_grade:=case
    when p_elapsed_ms<10000 then 'master'
    when p_elapsed_ms<13000 then 'diamond'
    when p_elapsed_ms<17000 then 'gold'
    when p_elapsed_ms<22000 then 'silver'
    else 'bronze'
  end;
  return jsonb_build_object(
    'week_key',wk,'total_players',total_count,'my_rank',rank_value,
    'my_best_ms',best_value,'my_play_count',total_plays,
    'expected_grade',expected_grade,'new_titles','[]'::jsonb
  );
end $$;

drop function if exists public.get_shelter_leaderboard();
create function public.get_shelter_leaderboard(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid();
  wk date;
  top_rows jsonb;
  total_count int;
  rank_value int;
  best_value int;
  total_plays int;
  available jsonb;
begin
  if p_now>now()+interval '5 minutes' then raise exception '미래 주차는 조회할 수 없습니다.'; end if;
  perform public.settle_shelter_weekly_titles(p_now);
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  wk:=public.current_shelter_week_key(p_now);

  with ranked as (
    select b.*,row_number() over(order by b.best_ms asc,b.updated_at asc,b.user_id asc)::int position
    from public.shelter_weekly_best b where b.week_key=wk
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',r.position,'user_id',r.user_id,'display_name',coalesce(p.display_name,'사용자'),'lab_name',coalesce(p.lab_name,'하루를 담다'),
    'avatar_path',p.avatar_path,'avatar_frame_tier',p.avatar_frame_tier,'avatar_frame_color',p.avatar_frame_color,
    'avatar_crown_color',p.avatar_crown_color,'active_title',p.active_title,'best_ms',r.best_ms,
    'expected_rank_title',case when r.position=1 then 'weekly_1st' when r.position=2 then 'weekly_2nd' when r.position=3 then 'weekly_3rd' when r.position<=10 then 'weekly_top10' end,
    'expected_grade',case when r.best_ms<10000 then 'master' when r.best_ms<13000 then 'diamond' when r.best_ms<17000 then 'gold' when r.best_ms<22000 then 'silver' else 'bronze' end
  ) order by r.position),'[]'::jsonb) into top_rows
  from ranked r join public.profiles p on p.id=r.user_id where r.position<=10;

  select count(*)::int into total_count from public.shelter_weekly_best where week_key=wk;
  select r.position,r.best_ms into rank_value,best_value from (
    select user_id,best_ms,row_number() over(order by best_ms asc,updated_at asc,user_id asc)::int position
    from public.shelter_weekly_best where week_key=wk
  ) r where r.user_id=u;
  select p.shelter_play_count,p.unlocked_titles into total_plays,available from public.profiles p where p.id=u;
  return jsonb_build_object(
    'week_key',wk,'top10',top_rows,'total_players',total_count,'my_rank',rank_value,
    'my_best_ms',best_value,'my_play_count',coalesce(total_plays,0),
    'available_titles',coalesce(available,'[]'::jsonb)
  );
end $$;

drop function if exists public.get_avatar_frames_v2(uuid[]);
create function public.get_avatar_frames_v2(p_ids uuid[])
returns table(id uuid,avatar_frame_tier text,avatar_frame_color text,avatar_crown_color text,active_title text)
language sql stable security definer set search_path=public,pg_temp as $$
  select p.id,p.avatar_frame_tier,p.avatar_frame_color,p.avatar_crown_color,
    case when p.active_title is not null and p.unlocked_titles ? p.active_title then p.active_title end
  from public.profiles p
  where p.id=any(coalesce(p_ids,array[]::uuid[]))
  limit 100
$$;

create or replace function public.restore_my_data(p_backup jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid();
  result jsonb;
  source jsonb:=p_backup->'profiles'->0;
  restored_titles jsonb;
  merged_titles jsonb;
  restored_active text;
  restored_count int;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  result:=public.restore_my_data_before_shelter(p_backup);
  if source is not null then
    restored_titles:=public.normalize_shelter_titles(coalesce(source->'unlocked_titles','[]'::jsonb));
    restored_active:=nullif(source->>'active_title','');
    begin restored_count:=greatest(0,coalesce((source->>'shelter_play_count')::int,0)); exception when others then restored_count:=0; end;
    select public.normalize_shelter_titles(unlocked_titles||restored_titles) into merged_titles from public.profiles where id=u;
    if restored_active is not null and not merged_titles ? restored_active then restored_active:=null; end if;
    update public.profiles set
      unlocked_titles=merged_titles,
      active_title=coalesce(restored_active,case when merged_titles ? active_title then active_title end),
      shelter_play_count=greatest(shelter_play_count,restored_count)
    where id=u;
  end if;
  return result;
end $$;

revoke all on function public.settle_shelter_weekly_titles(timestamptz) from public,anon,authenticated;
revoke all on function public.record_shelter_1to25(int),public.get_shelter_leaderboard(timestamptz),public.get_avatar_frames_v2(uuid[]),public.restore_my_data(jsonb) from public,anon;
grant execute on function public.record_shelter_1to25(int),public.get_shelter_leaderboard(timestamptz),public.get_avatar_frames_v2(uuid[]),public.restore_my_data(jsonb) to authenticated;
grant execute on function public.get_avatar_frames_v2(uuid[]) to anon;

do $$
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    if not exists(select 1 from cron.job where jobname='settle-shelter-weekly-titles') then
      perform cron.schedule('settle-shelter-weekly-titles','0 15 * * 1','select public.settle_shelter_weekly_titles();');
    end if;
  end if;
exception when undefined_table or insufficient_privilege then
  raise notice 'pg_cron scheduling skipped; RPC fallback remains active';
end $$;

commit;
