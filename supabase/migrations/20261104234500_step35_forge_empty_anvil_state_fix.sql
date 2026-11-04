begin;

create or replace function public.get_forge_state()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); sword public.shelter_forge_swords; value_row record; rates_json jsonb:=null; history jsonb; graves jsonb; stats jsonb; leaders jsonb; next_at timestamptz;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  insert into public.shelter_forge_swords(user_id,sword_name) values(u,public.forge_level_name(0)) on conflict(user_id) do nothing;
  perform public.refresh_forge_stamina(u,now());
  select * into sword from public.shelter_forge_swords where user_id=u;
  select * into value_row from public.forge_level_value(sword.sword_level);
  if sword.has_sword and sword.sword_level<30 then
    select jsonb_build_object('success',r.success_rate,'stay',r.stay_rate,'destroy',r.destroy_rate,'target_name',r.target_name)
      into rates_json from public.forge_rates(sword.sword_level) r;
  end if;
  next_at:=case when sword.stamina<5 then sword.stamina_updated_at+interval '10 minutes' else null end;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into history from(select * from public.shelter_forge_attempts where user_id=u order by created_at desc limit 20)x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into graves from(select g.*,coalesce((select count(*) from public.publication_likes l where l.publication_id=g.publication_id),0)rip_count from public.shelter_forge_graveyard g order by g.created_at desc limit 60)x;
  select to_jsonb(s) into stats from public.shelter_forge_global_stats s where id=1;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank),'[]'::jsonb) into leaders from(
    select row_number()over(order by b.appraisal desc,b.sword_level desc,b.registered_at asc)::int rank,b.*,p.display_name,p.lab_name,p.avatar_path,p.avatar_frame_tier,p.avatar_frame_color,p.avatar_crown_color,case when p.active_title is not null and p.unlocked_titles?p.active_title then p.active_title end active_title
    from public.shelter_forge_best b join public.profiles p on p.id=b.user_id order by b.appraisal desc,b.sword_level desc,b.registered_at asc limit 20
  )x;
  return jsonb_build_object('sword',to_jsonb(sword)||jsonb_build_object('appraisal',value_row.appraisal,'base_appraisal',value_row.appraisal,'stamina_next_at',next_at,'daily_supply_claimed',sword.daily_supply_date=(now()at time zone'Asia/Seoul')::date),'rates',rates_json,'history',history,'graveyard',graves,'stats',stats,'leaderboard',leaders);
end $$;

commit;
