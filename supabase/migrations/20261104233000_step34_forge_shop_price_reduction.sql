begin;

create or replace function public.buy_forge_item(p_item_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();s public.shelter_forge_swords;cost int:=0;fragment_cost int:=0;add_shield int:=0;add_whetstone int:=0;add_stamina int:=0;target_level int:=0;today_kst date:=(now()at time zone'Asia/Seoul')::date;
begin
  if u is null then raise exception'로그인이 필요합니다.';end if;
  insert into public.shelter_forge_swords(user_id,sword_name)values(u,public.forge_level_name(0))on conflict(user_id)do nothing;perform public.refresh_forge_stamina(u,now());select*into s from public.shelter_forge_swords where user_id=u for update;
  case p_item_key when'stamina_1'then cost:=120;add_stamina:=1;when'whetstone_1'then cost:=100;add_whetstone:=1;when'shield_1'then cost:=200;add_shield:=1;when'shield_5'then cost:=900;add_shield:=5;when'shield_10'then cost:=1700;add_shield:=10;when'sword_10'then cost:=300;target_level:=10;when'sword_15'then cost:=1000;target_level:=15;when'sword_20'then cost:=3000;target_level:=20;when'shard_stamina'then fragment_cost:=5;add_stamina:=1;when'shard_whetstone'then fragment_cost:=10;add_whetstone:=1;when'shard_shield'then fragment_cost:=25;add_shield:=1;else raise exception'상품을 확인해 주세요.';end case;
  if s.points<cost then raise exception'대장간 포인트가 부족합니다.';end if;if s.shards<fragment_cost then raise exception'검의 파편이 부족합니다.';end if;if add_stamina>0 and s.stamina>=5 then raise exception'풀무 기운이 이미 가득 찼습니다.';end if;if p_item_key='stamina_1'and(case when s.stamina_buys_date=today_kst then s.stamina_buys_count else 0 end)>=5 then raise exception'포인트 기운 충전은 하루 5회까지 가능합니다.';end if;if target_level>0 and s.has_sword and s.sword_level>=target_level then raise exception'현재 검보다 높은 단계의 검만 장착할 수 있습니다.';end if;
  update public.shelter_forge_swords set points=points-cost,shards=shards-fragment_cost,shields=shields+add_shield,whetstones=whetstones+add_whetstone,stamina=least(5,stamina+add_stamina),stamina_updated_at=case when add_stamina>0 and least(5,stamina+add_stamina)=5 then now()else stamina_updated_at end,has_sword=case when target_level>0 then true else has_sword end,sword_level=case when target_level>0 then target_level else sword_level end,sword_name=case when target_level>0 then public.forge_level_name(target_level)else sword_name end,custom_name=case when target_level>0 then null else custom_name end,sharpness_bonus=0,max_level_reached=greatest(max_level_reached,target_level),stamina_buys_date=case when p_item_key='stamina_1'then today_kst else stamina_buys_date end,stamina_buys_count=case when p_item_key='stamina_1'then(case when stamina_buys_date=today_kst then stamina_buys_count+1 else 1 end)else stamina_buys_count end,updated_at=now()where user_id=u;
  if target_level>0 then perform public.unlock_forge_titles(u,target_level,s.total_destructions);end if;return public.get_forge_state();
end $$;

commit;
