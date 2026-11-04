begin;

alter table public.shelter_forge_swords add column if not exists has_sword boolean not null default true;

delete from public.shelter_forge_graveyard where sword_level<20;
alter table public.shelter_forge_graveyard drop constraint if exists shelter_forge_graveyard_sword_level_check;
alter table public.shelter_forge_graveyard add constraint shelter_forge_graveyard_sword_level_check check(sword_level between 20 and 30);

create or replace function public.forge_level_value(p_level int)
returns table(appraisal int,compensation int,shards int) language plpgsql immutable set search_path=public,pg_temp as $$
declare
  sales int[]:=array[0,2,5,10,20,35,55,80,115,155,200,260,330,420,520,650,800,1000,1250,1550,2000,2500,3100,3800,4600,5600,6800,8200,10000,12500,16000];
  comforts int[]:=array[0,0,0,1,2,3,5,8,11,15,20,26,33,42,52,65,80,100,125,155,200,250,310,380,460,560,680,820,1000,1250,1600];
  fragments int[]:=array[0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,5,5,5,5,5,8,8,8,8,8,12,12,12,12,12];
begin
  if p_level<0 or p_level>30 then raise exception '검 단계가 올바르지 않습니다.'; end if;
  return query select sales[p_level+1],comforts[p_level+1],fragments[p_level+1];
end $$;

create or replace function public.forge_rates(p_level int)
returns table(success_rate numeric,stay_rate numeric,destroy_rate numeric,target_name text,sale_points int,comfort_points int,destroy_shards int)
language plpgsql immutable set search_path=public,pg_temp as $$
declare
  successes numeric[]:=array[100,95,90,82,76,70,64,58,52,46,40,36,32,28,25,22,19,16,14,12,10,8.5,7,5.8,4.8,4,3.2,2.5,2,1.5];
  stays numeric[]:=array[0,5,10,15,19,23,26,29,32,34,38,39,40,41,41,41,42,43,43,43,43,42.5,42,41.2,40.2,39,37.8,36.5,35,33.5];
  destroys numeric[]:=array[0,0,0,3,5,7,10,13,16,20,22,25,28,31,34,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65];
  values_row record;
begin
  if p_level<0 or p_level>29 then raise exception '강화 가능한 단계가 아닙니다.'; end if;
  select * into values_row from public.forge_level_value(p_level+1);
  return query select successes[p_level+1],stays[p_level+1],destroys[p_level+1],public.forge_level_name(p_level+1),values_row.appraisal,values_row.compensation,values_row.shards;
end $$;

create or replace function public.get_forge_state()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); sword public.shelter_forge_swords; rates record; value_row record; history jsonb; graves jsonb; stats jsonb; leaders jsonb; next_at timestamptz;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  insert into public.shelter_forge_swords(user_id,sword_name) values(u,public.forge_level_name(0)) on conflict(user_id) do nothing;
  perform public.refresh_forge_stamina(u,now());
  select * into sword from public.shelter_forge_swords where user_id=u;
  select * into value_row from public.forge_level_value(sword.sword_level);
  if sword.has_sword and sword.sword_level<30 then select * into rates from public.forge_rates(sword.sword_level); end if;
  next_at:=case when sword.stamina<5 then sword.stamina_updated_at+interval '10 minutes' else null end;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into history from(select * from public.shelter_forge_attempts where user_id=u order by created_at desc limit 20)x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into graves from(select g.*,coalesce((select count(*) from public.publication_likes l where l.publication_id=g.publication_id),0)rip_count from public.shelter_forge_graveyard g order by g.created_at desc limit 60)x;
  select to_jsonb(s) into stats from public.shelter_forge_global_stats s where id=1;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank),'[]'::jsonb) into leaders from(
    select row_number()over(order by b.appraisal desc,b.sword_level desc,b.registered_at asc)::int rank,b.*,p.display_name,p.lab_name,p.avatar_path,p.avatar_frame_tier,p.avatar_frame_color,p.avatar_crown_color,case when p.active_title is not null and p.unlocked_titles?p.active_title then p.active_title end active_title
    from public.shelter_forge_best b join public.profiles p on p.id=b.user_id order by b.appraisal desc,b.sword_level desc,b.registered_at asc limit 20
  )x;
  return jsonb_build_object('sword',to_jsonb(sword)||jsonb_build_object('appraisal',value_row.appraisal,'base_appraisal',value_row.appraisal,'stamina_next_at',next_at,'daily_supply_claimed',sword.daily_supply_date=(now()at time zone'Asia/Seoul')::date),'rates',case when sword.has_sword and sword.sword_level<30 then jsonb_build_object('success',rates.success_rate,'stay',rates.stay_rate,'destroy',rates.destroy_rate,'target_name',rates.target_name)else null end,'history',history,'graveyard',graves,'stats',stats,'leaderboard',leaders);
end $$;

create or replace function public.draw_forge_sword()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); sword public.shelter_forge_swords;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  insert into public.shelter_forge_swords(user_id,sword_name) values(u,public.forge_level_name(0)) on conflict(user_id) do nothing;
  perform public.refresh_forge_stamina(u,now());
  select * into sword from public.shelter_forge_swords where user_id=u for update;
  if sword.has_sword then raise exception '이미 모루 위에 검이 있습니다.'; end if;
  if sword.stamina<1 then raise exception '풀무 기운이 부족합니다.'; end if;
  update public.shelter_forge_swords set has_sword=true,sword_level=0,sword_name=public.forge_level_name(0),custom_name=null,sharpness_bonus=0,stamina=stamina-1,stamina_updated_at=case when stamina=5 then now()else stamina_updated_at end,updated_at=now() where user_id=u;
  return public.get_forge_state();
end $$;

create or replace function public.attempt_forge(p_use_whetstone boolean default false,p_use_shield boolean default false,p_bellows_grade text default 'normal',p_test_roll numeric default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); sword public.shelter_forge_swords; rates record; current_value record; result_kind text; roll_value numeric; bonus numeric; next_level int; reward_points int:=0;reward_shards int:=0;new_destroy_count int;new_titles jsonb;result_state jsonb;
begin
  if u is null then raise exception '로그인이 필요합니다.';end if;
  if p_bellows_grade not in('normal','good','perfect')then raise exception '풀무질 등급이 올바르지 않습니다.';end if;
  insert into public.shelter_forge_swords(user_id,sword_name)values(u,public.forge_level_name(0))on conflict(user_id)do nothing;
  select * into sword from public.shelter_forge_swords where user_id=u for update;
  if not sword.has_sword then raise exception '모루 위에 검이 없습니다.';end if;
  if sword.sword_level>=30 then raise exception '이미 최종 신화 등급입니다.';end if;
  if p_use_whetstone and sword.whetstones<1 then raise exception '숫돌이 부족합니다.';end if;
  if p_use_shield and sword.shields<1 then raise exception '보호권이 부족합니다.';end if;
  if p_test_roll is not null and coalesce(auth.jwt()->>'role','')<>'service_role'then raise exception '테스트 난수는 사용할 수 없습니다.';end if;
  select * into rates from public.forge_rates(sword.sword_level);select * into current_value from public.forge_level_value(sword.sword_level);
  bonus:=case p_bellows_grade when'perfect'then 2 when'good'then 1 else 0 end+case when p_use_whetstone then 2 else 0 end;
  roll_value:=coalesce(p_test_roll,random()*100);result_kind:=public.resolve_forge_outcome(sword.sword_level,roll_value,bonus);next_level:=sword.sword_level;
  if result_kind='success'then next_level:=sword.sword_level+1;elsif result_kind='destroy'and p_use_shield then result_kind:='protected_destroy';elsif result_kind='destroy'then reward_points:=current_value.compensation;reward_shards:=current_value.shards;next_level:=0;end if;
  new_destroy_count:=sword.total_destructions+case when result_kind='destroy'then 1 else 0 end;
  update public.shelter_forge_swords set has_sword=result_kind<>'destroy',sword_level=next_level,sword_name=public.forge_level_name(next_level),custom_name=case when result_kind='destroy'then null else custom_name end,points=points+reward_points,shards=shards+reward_shards,whetstones=whetstones-case when p_use_whetstone then 1 else 0 end,shields=shields-case when p_use_shield then 1 else 0 end,sharpness_bonus=0,max_level_reached=greatest(max_level_reached,next_level),total_attempts=total_attempts+1,total_destructions=new_destroy_count,updated_at=now()where user_id=u;
  insert into public.shelter_forge_attempts(user_id,level_before,level_after,outcome,success_rate,stay_rate,destroy_rate,bellows_bonus,bellows_grade,sharpness_gained,used_whetstone,used_shield,appraisal_after)values(u,sword.sword_level,next_level,result_kind,least(100-rates.destroy_rate,rates.success_rate+bonus),greatest(0,rates.stay_rate-bonus),rates.destroy_rate,p_bellows_grade='perfect',p_bellows_grade,0,p_use_whetstone,p_use_shield,(select appraisal from public.forge_level_value(next_level)));
  update public.shelter_forge_global_stats set total_enhances=total_enhances+1,total_destructions=total_destructions+case when result_kind='destroy'then 1 else 0 end,highest_level=greatest(highest_level,next_level),mythic_created_count=mythic_created_count+case when result_kind='success'and next_level=30 then 1 else 0 end,stage_attempts=jsonb_set(stage_attempts,array[sword.sword_level::text],to_jsonb(coalesce((stage_attempts->>(sword.sword_level::text))::bigint,0)+1),true),updated_at=now()where id=1;
  if result_kind='destroy'and sword.sword_level>=20 then insert into public.shelter_forge_graveyard(user_id,author_name,sword_level,sword_name,custom_name,rip_message,appraisal,hammer_count,compensation_points)select u,coalesce(p.display_name,'사용자'),sword.sword_level,sword.sword_name,sword.custom_name,'수많은 불꽃 속에서 잠들다.',current_value.appraisal,sword.total_attempts+1,reward_points from public.profiles p where p.id=u;end if;
  new_titles:=public.unlock_forge_titles(u,next_level,new_destroy_count);result_state:=public.get_forge_state();return result_state||jsonb_build_object('result',jsonb_build_object('outcome',result_kind,'level_before',sword.sword_level,'level_after',next_level,'points_gained',reward_points,'shards_gained',reward_shards,'bellows_grade',p_bellows_grade,'sharpness_gained',0,'used_whetstone',p_use_whetstone,'used_shield',p_use_shield,'new_titles',new_titles));
end $$;

create or replace function public.buy_forge_item(p_item_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();s public.shelter_forge_swords;cost int:=0;fragment_cost int:=0;add_shield int:=0;add_whetstone int:=0;add_stamina int:=0;target_level int:=0;today_kst date:=(now()at time zone'Asia/Seoul')::date;
begin
  if u is null then raise exception'로그인이 필요합니다.';end if;
  insert into public.shelter_forge_swords(user_id,sword_name)values(u,public.forge_level_name(0))on conflict(user_id)do nothing;perform public.refresh_forge_stamina(u,now());select*into s from public.shelter_forge_swords where user_id=u for update;
  case p_item_key when'stamina_1'then cost:=150;add_stamina:=1;when'whetstone_1'then cost:=300;add_whetstone:=1;when'shield_1'then cost:=500;add_shield:=1;when'shield_5'then cost:=2250;add_shield:=5;when'shield_10'then cost:=4250;add_shield:=10;when'sword_10'then cost:=600;target_level:=10;when'sword_15'then cost:=2000;target_level:=15;when'sword_20'then cost:=6500;target_level:=20;when'shard_stamina'then fragment_cost:=5;add_stamina:=1;when'shard_whetstone'then fragment_cost:=10;add_whetstone:=1;when'shard_shield'then fragment_cost:=30;add_shield:=1;else raise exception'상품을 확인해 주세요.';end case;
  if s.points<cost then raise exception'대장간 포인트가 부족합니다.';end if;if s.shards<fragment_cost then raise exception'검의 파편이 부족합니다.';end if;if add_stamina>0 and s.stamina>=5 then raise exception'풀무 기운이 이미 가득 찼습니다.';end if;if p_item_key='stamina_1'and(case when s.stamina_buys_date=today_kst then s.stamina_buys_count else 0 end)>=5 then raise exception'포인트 기운 충전은 하루 5회까지 가능합니다.';end if;if target_level>0 and s.has_sword and s.sword_level>=target_level then raise exception'현재 검보다 높은 단계의 검만 장착할 수 있습니다.';end if;
  update public.shelter_forge_swords set points=points-cost,shards=shards-fragment_cost,shields=shields+add_shield,whetstones=whetstones+add_whetstone,stamina=least(5,stamina+add_stamina),stamina_updated_at=case when add_stamina>0 and least(5,stamina+add_stamina)=5 then now()else stamina_updated_at end,has_sword=case when target_level>0 then true else has_sword end,sword_level=case when target_level>0 then target_level else sword_level end,sword_name=case when target_level>0 then public.forge_level_name(target_level)else sword_name end,custom_name=case when target_level>0 then null else custom_name end,sharpness_bonus=0,max_level_reached=greatest(max_level_reached,target_level),stamina_buys_date=case when p_item_key='stamina_1'then today_kst else stamina_buys_date end,stamina_buys_count=case when p_item_key='stamina_1'then(case when stamina_buys_date=today_kst then stamina_buys_count+1 else 1 end)else stamina_buys_count end,updated_at=now()where user_id=u;
  if target_level>0 then perform public.unlock_forge_titles(u,target_level,s.total_destructions);end if;return public.get_forge_state();
end $$;

create or replace function public.sell_forge_sword()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();s public.shelter_forge_swords;v record;earned int;begin if u is null then raise exception'로그인이 필요합니다.';end if;select*into s from public.shelter_forge_swords where user_id=u for update;if not s.has_sword or s.sword_level<1 then raise exception'1강 이상의 검만 판매할 수 있습니다.';end if;select*into v from public.forge_level_value(s.sword_level);earned:=v.appraisal;update public.shelter_forge_swords set points=points+earned,has_sword=false,sword_level=0,sword_name=public.forge_level_name(0),custom_name=null,sharpness_bonus=0,updated_at=now()where user_id=u;return public.get_forge_state()||jsonb_build_object('transaction',jsonb_build_object('kind','sale','points',earned));end$$;

create or replace function public.register_forge_hall(p_custom_name text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();s public.shelter_forge_swords;v record;clean text:=nullif(btrim(coalesce(p_custom_name,'')),'');score int;updated_best boolean:=false;begin if u is null then raise exception'로그인이 필요합니다.';end if;if clean is null or char_length(clean)>12 then raise exception'검 이름은 1~12자로 입력해 주세요.';end if;select*into s from public.shelter_forge_swords where user_id=u for update;if not s.has_sword or s.sword_level<1 then raise exception'1강 이상의 검만 등록할 수 있습니다.';end if;select*into v from public.forge_level_value(s.sword_level);score:=v.appraisal;insert into public.shelter_forge_best(user_id,sword_level,sword_name,custom_name,appraisal,hammer_count)values(u,s.sword_level,s.sword_name,clean,score,s.total_attempts)on conflict(user_id)do update set sword_level=excluded.sword_level,sword_name=excluded.sword_name,custom_name=excluded.custom_name,appraisal=excluded.appraisal,hammer_count=excluded.hammer_count,registered_at=now()where excluded.appraisal>public.shelter_forge_best.appraisal returning true into updated_best;update public.shelter_forge_swords set has_sword=false,sword_level=0,sword_name=public.forge_level_name(0),custom_name=null,sharpness_bonus=0,updated_at=now()where user_id=u;return public.get_forge_state()||jsonb_build_object('transaction',jsonb_build_object('kind','hall','best_updated',coalesce(updated_best,false),'appraisal',score));end$$;

create or replace function public.publish_forge_showcase()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();s public.shelter_forge_swords;v record;pname text;pub uuid;begin if u is null then raise exception'로그인이 필요합니다.';end if;select*into s from public.shelter_forge_swords where user_id=u;if not s.has_sword or s.sword_level<1 then raise exception'1강 이상의 검만 자랑할 수 있습니다.';end if;select display_name into pname from public.profiles where id=u and terms_accepted_at is not null;if pname is null then raise exception'광장 이용약관 동의 후 공유할 수 있습니다.';end if;select*into v from public.forge_level_value(s.sword_level);update public.profiles set public_profile=true where id=u;insert into public.publications(user_id,source_type,source_id,audience,title,body,meta,published_at)values(u,'forge',gen_random_uuid(),'public',format('+%s강 명검 감정서',s.sword_level),format('%s님의 명검 감정서',pname),jsonb_build_object('forge_event','showcase','sword_level',s.sword_level,'sword_name',s.sword_name,'custom_name',s.custom_name,'appraisal',v.appraisal,'hammer_count',s.total_attempts),now())returning id into pub;return jsonb_build_object('publication_id',pub);end$$;

revoke all on function public.draw_forge_sword() from public,anon;
grant execute on function public.draw_forge_sword() to authenticated;

commit;
