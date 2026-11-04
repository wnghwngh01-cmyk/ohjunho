begin;

alter table public.shelter_forge_swords
  add column if not exists points int not null default 0,
  add column if not exists stamina int not null default 5,
  add column if not exists stamina_updated_at timestamptz not null default now(),
  add column if not exists sharpness_bonus int not null default 0,
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists tutorial_completed_at timestamptz,
  add column if not exists daily_supply_date date,
  add column if not exists stamina_buys_date date,
  add column if not exists stamina_buys_count int not null default 0;
alter table public.shelter_forge_swords alter column sword_name set default '수련용 목검';
alter table public.shelter_forge_swords drop constraint if exists shelter_forge_swords_points_check;
alter table public.shelter_forge_swords add constraint shelter_forge_swords_points_check check(points>=0);
alter table public.shelter_forge_swords drop constraint if exists shelter_forge_swords_stamina_check;
alter table public.shelter_forge_swords add constraint shelter_forge_swords_stamina_check check(stamina between 0 and 5);
alter table public.shelter_forge_swords drop constraint if exists shelter_forge_swords_sharpness_check;
alter table public.shelter_forge_swords add constraint shelter_forge_swords_sharpness_check check(sharpness_bonus>=0);

alter table public.shelter_forge_attempts
  add column if not exists stay_rate numeric(5,2) not null default 0,
  add column if not exists bellows_grade text not null default 'normal',
  add column if not exists sharpness_gained int not null default 0,
  add column if not exists appraisal_after int not null default 0;
update public.shelter_forge_attempts set outcome='stay',level_after=level_before where outcome='downgrade';
alter table public.shelter_forge_attempts drop constraint if exists shelter_forge_attempts_outcome_check;
alter table public.shelter_forge_attempts add constraint shelter_forge_attempts_outcome_check check(outcome in('success','stay','destroy','protected_destroy'));
alter table public.shelter_forge_attempts drop constraint if exists shelter_forge_attempts_bellows_grade_check;
alter table public.shelter_forge_attempts add constraint shelter_forge_attempts_bellows_grade_check check(bellows_grade in('normal','good','perfect'));

alter table public.shelter_forge_graveyard drop constraint if exists shelter_forge_graveyard_sword_level_check;
alter table public.shelter_forge_graveyard add constraint shelter_forge_graveyard_sword_level_check check(sword_level between 10 and 30);
alter table public.shelter_forge_graveyard
  add column if not exists appraisal int not null default 0,
  add column if not exists hammer_count int not null default 0,
  add column if not exists compensation_points int not null default 0;

alter table public.shelter_forge_global_stats add column if not exists stage_attempts jsonb not null default '{}'::jsonb;

create table if not exists public.shelter_forge_best(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sword_level int not null check(sword_level between 1 and 30),
  sword_name varchar(24) not null,
  custom_name varchar(12) not null,
  appraisal int not null check(appraisal>0),
  hammer_count int not null check(hammer_count>=0),
  registered_at timestamptz not null default now()
);
create index if not exists shelter_forge_best_rank_idx on public.shelter_forge_best(appraisal desc,sword_level desc,registered_at asc);
alter table public.shelter_forge_best enable row level security;
revoke all on public.shelter_forge_best from public,anon,authenticated;
grant select on public.shelter_forge_best to authenticated;
drop policy if exists forge_best_read on public.shelter_forge_best;
create policy forge_best_read on public.shelter_forge_best for select to authenticated using(true);

create or replace function public.normalize_shelter_titles(value jsonb)
returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare
  allowed constant text[]:=array['master','diamond','gold','silver','bronze','regular','weekly_1st','weekly_2nd','weekly_3rd','weekly_top10','forge_apprentice','forge_bronze','forge_silver','forge_gold','forge_diamond','forge_master','forge_mythic','forge_destroyer'];
  result jsonb:='[]'::jsonb; code text;
begin
  if jsonb_typeof(value)<>'array' then return result; end if;
  for code in select distinct item from jsonb_array_elements_text(value) item where item=any(allowed) order by item loop result:=result||to_jsonb(code); end loop;
  return result;
end $$;
update public.profiles set unlocked_titles=public.normalize_shelter_titles(unlocked_titles);

drop function if exists public.attempt_forge(boolean,boolean,boolean,numeric);
drop function if exists public.get_forge_state();
drop function if exists public.exchange_forge_item(text);
drop function if exists public.resolve_forge_outcome(int,numeric,numeric);
drop function if exists public.forge_rates(int);

create or replace function public.forge_level_name(p_level int)
returns text language plpgsql immutable set search_path=public,pg_temp as $$
declare names text[]:=array['수련용 목검','무딘 철검','단련된 강철검','기사의 제식 장검','정예병의 브로드소드','바람을 가르는 세이버','붉은 늑대의 이빨검','푸른 숲의 수호검','흑요석 카타나','백은의 기사도검','거인 학살자의 대검','뇌전의 레이피어','빙결의 크리스탈 소드','진홍의 화염 플람베르주','폭풍을 부르는 자','영혼을 베는 에스톡','황혼의 마검','별빛을 머금은 성검','차원의 집행검','명왕의 참마도','태양신의 군주검','용살자의 드래곤 슬레이어','불멸의 엑스칼리버','천상의 발키리 소드','심연의 종언검','시공을 베는 크로노스','은하수의 성좌검','파멸의 라그나로크','천지개벽의 성검','무한의 아포칼립스','창세의 신화검 · 에테르'];
begin if p_level<0 or p_level>30 then raise exception '검 단계가 올바르지 않습니다.'; end if; return names[p_level+1]; end $$;
update public.shelter_forge_swords set sword_name=public.forge_level_name(sword_level);

create or replace function public.forge_level_value(p_level int)
returns table(appraisal int,compensation int,shards int) language plpgsql immutable set search_path=public,pg_temp as $$
declare
  sales int[]:=array[0,2,5,10,20,35,55,80,115,155,200,260,330,420,520,650,800,1000,1250,1550,2000,2500,3100,3800,4600,5600,6800,8200,10000,12500,16000];
  comforts int[]:=array[0,1,2,5,10,17,27,40,57,77,100,130,165,210,260,325,400,500,625,775,1000,1250,1550,1900,2300,2800,3400,4100,5000,6250,8000];
  fragments int[]:=array[0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,5,5,5,5,5,8,8,8,8,8,12,12,12,12,12];
begin if p_level<0 or p_level>30 then raise exception '검 단계가 올바르지 않습니다.'; end if; return query select sales[p_level+1],comforts[p_level+1],fragments[p_level+1]; end $$;

create function public.forge_rates(p_level int)
returns table(success_rate numeric,stay_rate numeric,destroy_rate numeric,target_name text,sale_points int,comfort_points int,destroy_shards int)
language plpgsql immutable set search_path=public,pg_temp as $$
declare
  successes numeric[]:=array[100,95,90,85,80,75,70,65,60,55,50,46,42,38,34,30,27,24,21,18.5,16.5,14.5,12.5,11,9.5,8.2,7,6,5,4.2];
  stays numeric[]:=array[0,5,10,14,18,22,26,30,34,38,42,45,48,51,54,57,59,61,63,64.5,65.5,66.5,67.5,68,68.5,68.8,69,69,69,68.8];
  destroys numeric[]:=array[0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27];
  values_row record;
begin
  if p_level<0 or p_level>29 then raise exception '강화 가능한 단계가 아닙니다.'; end if;
  select * into values_row from public.forge_level_value(p_level+1);
  return query select successes[p_level+1],stays[p_level+1],destroys[p_level+1],public.forge_level_name(p_level+1),values_row.appraisal,values_row.compensation,values_row.shards;
end $$;

create function public.resolve_forge_outcome(p_level int,p_roll numeric,p_bonus numeric default 0)
returns text language plpgsql immutable set search_path=public,pg_temp as $$
declare r record; adjusted numeric;
begin
  if p_roll<0 or p_roll>=100 then raise exception '강화 난수 범위가 올바르지 않습니다.'; end if;
  select * into r from public.forge_rates(p_level); adjusted:=least(100-r.destroy_rate,r.success_rate+greatest(0,least(coalesce(p_bonus,0),4)));
  if p_roll<adjusted then return 'success'; end if;
  if p_roll<adjusted+r.stay_rate-greatest(0,least(coalesce(p_bonus,0),4)) then return 'stay'; end if;
  return 'destroy';
end $$;

create function public.refresh_forge_stamina(p_user uuid,p_now timestamptz default now())
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare row_data public.shelter_forge_swords; gained int;
begin
  select * into row_data from public.shelter_forge_swords where user_id=p_user for update;
  gained:=greatest(0,floor(extract(epoch from(p_now-row_data.stamina_updated_at))/600)::int);
  if gained>0 then
    update public.shelter_forge_swords set stamina=least(5,stamina+gained),stamina_updated_at=case when stamina+gained>=5 then p_now else stamina_updated_at+(gained*interval '10 minutes') end where user_id=p_user;
  end if;
end $$;

create function public.unlock_forge_titles(p_user uuid,p_level int,p_destructions int)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare earned jsonb:='[]'::jsonb; before_titles jsonb; after_titles jsonb;
begin
  if p_level>=1 then earned:=earned||to_jsonb('forge_apprentice'::text); end if;
  if p_level>=10 then earned:=earned||to_jsonb('forge_bronze'::text); end if;
  if p_level>=15 then earned:=earned||to_jsonb('forge_silver'::text); end if;
  if p_level>=20 then earned:=earned||to_jsonb('forge_gold'::text); end if;
  if p_level>=24 then earned:=earned||to_jsonb('forge_diamond'::text); end if;
  if p_level>=27 then earned:=earned||to_jsonb('forge_master'::text); end if;
  if p_level>=30 then earned:=earned||to_jsonb('forge_mythic'::text); end if;
  if p_destructions>=10 then earned:=earned||to_jsonb('forge_destroyer'::text); end if;
  select unlocked_titles into before_titles from public.profiles where id=p_user for update;
  after_titles:=public.normalize_shelter_titles(coalesce(before_titles,'[]'::jsonb)||earned);
  update public.profiles set unlocked_titles=after_titles where id=p_user;
  return coalesce((select jsonb_agg(to_jsonb(code)) from jsonb_array_elements_text(after_titles) code where not coalesce(before_titles,'[]'::jsonb)?code),'[]'::jsonb);
end $$;

create function public.get_forge_state()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); sword public.shelter_forge_swords; rates record; value_row record; history jsonb; graves jsonb; stats jsonb; leaders jsonb; next_at timestamptz;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  insert into public.shelter_forge_swords(user_id,sword_name) values(u,public.forge_level_name(0)) on conflict(user_id) do nothing;
  perform public.refresh_forge_stamina(u,now());select * into sword from public.shelter_forge_swords where user_id=u;
  select * into value_row from public.forge_level_value(sword.sword_level);
  if sword.sword_level<30 then select * into rates from public.forge_rates(sword.sword_level); end if;
  next_at:=case when sword.stamina<5 then sword.stamina_updated_at+interval '10 minutes' else null end;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into history from(select * from public.shelter_forge_attempts where user_id=u order by created_at desc limit 40)x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into graves from(select g.*,coalesce((select count(*) from public.publication_likes l where l.publication_id=g.publication_id),0)rip_count from public.shelter_forge_graveyard g order by g.created_at desc limit 60)x;
  select to_jsonb(s) into stats from public.shelter_forge_global_stats s where id=1;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank),'[]'::jsonb) into leaders from(
    select row_number()over(order by b.appraisal desc,b.sword_level desc,b.registered_at asc)::int rank,b.*,p.display_name,p.lab_name,p.avatar_path,p.avatar_frame_tier,p.avatar_frame_color,p.avatar_crown_color,case when p.active_title is not null and p.unlocked_titles?p.active_title then p.active_title end active_title
    from public.shelter_forge_best b join public.profiles p on p.id=b.user_id order by b.appraisal desc,b.sword_level desc,b.registered_at asc limit 20
  )x;
  return jsonb_build_object('sword',to_jsonb(sword)||jsonb_build_object('appraisal',value_row.appraisal+sword.sharpness_bonus,'base_appraisal',value_row.appraisal,'stamina_next_at',next_at,'daily_supply_claimed',sword.daily_supply_date=(now()at time zone'Asia/Seoul')::date),'rates',case when sword.sword_level<30 then jsonb_build_object('success',rates.success_rate,'stay',rates.stay_rate,'destroy',rates.destroy_rate,'target_name',rates.target_name)else null end,'history',history,'graveyard',graves,'stats',stats,'leaderboard',leaders);
end $$;

create function public.attempt_forge(p_use_whetstone boolean default false,p_use_shield boolean default false,p_bellows_grade text default 'normal',p_test_roll numeric default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); sword public.shelter_forge_swords; rates record; current_value record; result_kind text; roll_value numeric; bonus numeric; sharpness int; next_level int; reward_points int:=0;reward_shards int:=0;new_destroy_count int;new_titles jsonb;result_state jsonb;
begin
  if u is null then raise exception '로그인이 필요합니다.';end if;if p_bellows_grade not in('normal','good','perfect')then raise exception '풀무질 등급이 올바르지 않습니다.';end if;
  insert into public.shelter_forge_swords(user_id,sword_name)values(u,public.forge_level_name(0))on conflict(user_id)do nothing;perform public.refresh_forge_stamina(u,now());select * into sword from public.shelter_forge_swords where user_id=u for update;
  if sword.stamina<1 then raise exception '풀무 기운이 부족합니다.';end if;if sword.sword_level>=30 then raise exception '이미 최종 신화 등급입니다.';end if;if p_use_whetstone and sword.whetstones<1 then raise exception '숫돌이 부족합니다.';end if;if p_use_shield and sword.shields<1 then raise exception '보호권이 부족합니다.';end if;
  if p_test_roll is not null and coalesce(auth.jwt()->>'role','')<>'service_role'then raise exception '테스트 난수는 사용할 수 없습니다.';end if;
  select * into rates from public.forge_rates(sword.sword_level);select * into current_value from public.forge_level_value(sword.sword_level);
  bonus:=case p_bellows_grade when'perfect'then 2 when'good'then 1 else 0 end+case when p_use_whetstone then 2 else 0 end;sharpness:=case p_bellows_grade when'perfect'then 100 when'good'then 60 else 25 end;roll_value:=coalesce(p_test_roll,random()*100);result_kind:=public.resolve_forge_outcome(sword.sword_level,roll_value,bonus);next_level:=sword.sword_level;
  if result_kind='success'then next_level:=sword.sword_level+1;elsif result_kind='destroy'and p_use_shield then result_kind:='protected_destroy';elsif result_kind='destroy'then reward_points:=current_value.compensation;reward_shards:=current_value.shards;next_level:=0;end if;
  new_destroy_count:=sword.total_destructions+case when result_kind='destroy'then 1 else 0 end;
  update public.shelter_forge_swords set sword_level=next_level,sword_name=public.forge_level_name(next_level),custom_name=case when result_kind='destroy'then null else custom_name end,points=points+reward_points,shards=shards+reward_shards,whetstones=whetstones-case when p_use_whetstone then 1 else 0 end,shields=shields-case when p_use_shield then 1 else 0 end,stamina=stamina-1,stamina_updated_at=case when stamina=5 then now() else stamina_updated_at end,sharpness_bonus=case when result_kind='destroy'then 0 else sharpness_bonus+sharpness end,max_level_reached=greatest(max_level_reached,next_level),total_attempts=total_attempts+1,total_destructions=new_destroy_count,updated_at=now()where user_id=u;
  insert into public.shelter_forge_attempts(user_id,level_before,level_after,outcome,success_rate,stay_rate,destroy_rate,bellows_bonus,bellows_grade,sharpness_gained,used_whetstone,used_shield,appraisal_after)values(u,sword.sword_level,next_level,result_kind,least(100-rates.destroy_rate,rates.success_rate+bonus),greatest(0,rates.stay_rate-bonus),rates.destroy_rate,p_bellows_grade='perfect',p_bellows_grade,sharpness,p_use_whetstone,p_use_shield,(select appraisal from public.forge_level_value(next_level))+case when result_kind='destroy'then 0 else sword.sharpness_bonus+sharpness end);
  update public.shelter_forge_global_stats set total_enhances=total_enhances+1,total_destructions=total_destructions+case when result_kind='destroy'then 1 else 0 end,highest_level=greatest(highest_level,next_level),mythic_created_count=mythic_created_count+case when result_kind='success'and next_level=30 then 1 else 0 end,stage_attempts=jsonb_set(stage_attempts,array[sword.sword_level::text],to_jsonb(coalesce((stage_attempts->>(sword.sword_level::text))::bigint,0)+1),true),updated_at=now()where id=1;
  if result_kind='destroy'and sword.sword_level>=10 then insert into public.shelter_forge_graveyard(user_id,author_name,sword_level,sword_name,custom_name,rip_message,appraisal,hammer_count,compensation_points)select u,coalesce(p.display_name,'사용자'),sword.sword_level,sword.sword_name,sword.custom_name,'수많은 불꽃 속에서 잠들다.',current_value.appraisal+sword.sharpness_bonus,sword.total_attempts+1,reward_points from public.profiles p where p.id=u;end if;
  new_titles:=public.unlock_forge_titles(u,next_level,new_destroy_count);result_state:=public.get_forge_state();return result_state||jsonb_build_object('result',jsonb_build_object('outcome',result_kind,'level_before',sword.sword_level,'level_after',next_level,'points_gained',reward_points,'shards_gained',reward_shards,'bellows_grade',p_bellows_grade,'sharpness_gained',sharpness,'used_whetstone',p_use_whetstone,'used_shield',p_use_shield,'new_titles',new_titles));
end $$;

create function public.claim_forge_tutorial()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();begin if u is null then raise exception'로그인이 필요합니다.';end if;insert into public.shelter_forge_swords(user_id,sword_name)values(u,public.forge_level_name(0))on conflict(user_id)do nothing;update public.shelter_forge_swords set tutorial_completed_at=now(),points=points+100,shields=shields+1,updated_at=now()where user_id=u and tutorial_completed_at is null;if not found then raise exception'튜토리얼 보너스를 이미 받았습니다.';end if;return public.get_forge_state();end$$;

create function public.claim_forge_daily_supply()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();today_kst date:=(now()at time zone'Asia/Seoul')::date;begin if u is null then raise exception'로그인이 필요합니다.';end if;insert into public.shelter_forge_swords(user_id,sword_name)values(u,public.forge_level_name(0))on conflict(user_id)do nothing;update public.shelter_forge_swords set daily_supply_date=today_kst,points=points+50,shields=shields+1,updated_at=now()where user_id=u and daily_supply_date is distinct from today_kst;if not found then raise exception'오늘의 무료 보급을 이미 받았습니다.';end if;return public.get_forge_state();end$$;

create function public.buy_forge_item(p_item_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();s public.shelter_forge_swords;cost int:=0;fragment_cost int:=0;add_shield int:=0;add_whetstone int:=0;add_stamina int:=0;target_level int:=0;today_kst date:=(now()at time zone'Asia/Seoul')::date;
begin if u is null then raise exception'로그인이 필요합니다.';end if;insert into public.shelter_forge_swords(user_id,sword_name)values(u,public.forge_level_name(0))on conflict(user_id)do nothing;perform public.refresh_forge_stamina(u,now());select*into s from public.shelter_forge_swords where user_id=u for update;
  case p_item_key when'stamina_1'then cost:=50;add_stamina:=1;when'shield_1'then cost:=200;add_shield:=1;when'shield_5'then cost:=900;add_shield:=5;when'shield_10'then cost:=1700;add_shield:=10;when'whetstone_1'then cost:=250;add_whetstone:=1;when'sword_10'then cost:=280;target_level:=10;when'sword_15'then cost:=900;target_level:=15;when'sword_20'then cost:=3000;target_level:=20;when'shard_stamina'then fragment_cost:=5;add_stamina:=1;when'shard_whetstone'then fragment_cost:=10;add_whetstone:=1;when'shard_shield'then fragment_cost:=30;add_shield:=1;else raise exception'상품을 확인해 주세요.';end case;
  if s.points<cost then raise exception'대장간 포인트가 부족합니다.';end if;if s.shards<fragment_cost then raise exception'검의 파편이 부족합니다.';end if;if add_stamina>0 and s.stamina>=5 then raise exception'풀무 기운이 이미 가득 찼습니다.';end if;if p_item_key='stamina_1'and(case when s.stamina_buys_date=today_kst then s.stamina_buys_count else 0 end)>=5 then raise exception'포인트 기운 충전은 하루 5회까지 가능합니다.';end if;if target_level>0 and s.sword_level>=target_level then raise exception'현재 검보다 높은 단계의 검만 장착할 수 있습니다.';end if;
  update public.shelter_forge_swords set points=points-cost,shards=shards-fragment_cost,shields=shields+add_shield,whetstones=whetstones+add_whetstone,stamina=least(5,stamina+add_stamina),stamina_updated_at=case when add_stamina>0 then now()else stamina_updated_at end,sword_level=case when target_level>0 then target_level else sword_level end,sword_name=case when target_level>0 then public.forge_level_name(target_level)else sword_name end,custom_name=case when target_level>0 then null else custom_name end,sharpness_bonus=case when target_level>0 then 0 else sharpness_bonus end,max_level_reached=greatest(max_level_reached,target_level),stamina_buys_date=case when p_item_key='stamina_1'then today_kst else stamina_buys_date end,stamina_buys_count=case when p_item_key='stamina_1'then(case when stamina_buys_date=today_kst then stamina_buys_count+1 else 1 end)else stamina_buys_count end,updated_at=now()where user_id=u;
  if target_level>0 then perform public.unlock_forge_titles(u,target_level,s.total_destructions);end if;return public.get_forge_state();end$$;

create function public.sell_forge_sword()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();s public.shelter_forge_swords;v record;earned int;begin if u is null then raise exception'로그인이 필요합니다.';end if;select*into s from public.shelter_forge_swords where user_id=u for update;if s.sword_level<1 then raise exception'1강 이상의 검만 판매할 수 있습니다.';end if;select*into v from public.forge_level_value(s.sword_level);earned:=v.appraisal+s.sharpness_bonus;update public.shelter_forge_swords set points=points+earned,sword_level=0,sword_name=public.forge_level_name(0),custom_name=null,sharpness_bonus=0,updated_at=now()where user_id=u;return public.get_forge_state()||jsonb_build_object('transaction',jsonb_build_object('kind','sale','points',earned));end$$;

create function public.register_forge_hall(p_custom_name text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();s public.shelter_forge_swords;v record;clean text:=nullif(btrim(coalesce(p_custom_name,'')),'');score int;updated_best boolean:=false;begin if u is null then raise exception'로그인이 필요합니다.';end if;if clean is null or char_length(clean)>12 then raise exception'검 이름은 1~12자로 입력해 주세요.';end if;select*into s from public.shelter_forge_swords where user_id=u for update;if s.sword_level<1 then raise exception'1강 이상의 검만 등록할 수 있습니다.';end if;select*into v from public.forge_level_value(s.sword_level);score:=v.appraisal+s.sharpness_bonus;insert into public.shelter_forge_best(user_id,sword_level,sword_name,custom_name,appraisal,hammer_count)values(u,s.sword_level,s.sword_name,clean,score,s.total_attempts)on conflict(user_id)do update set sword_level=excluded.sword_level,sword_name=excluded.sword_name,custom_name=excluded.custom_name,appraisal=excluded.appraisal,hammer_count=excluded.hammer_count,registered_at=now()where excluded.appraisal>public.shelter_forge_best.appraisal returning true into updated_best;update public.shelter_forge_swords set sword_level=0,sword_name=public.forge_level_name(0),custom_name=null,sharpness_bonus=0,updated_at=now()where user_id=u;return public.get_forge_state()||jsonb_build_object('transaction',jsonb_build_object('kind','hall','best_updated',coalesce(updated_best,false),'appraisal',score));end$$;

create function public.publish_forge_showcase()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();s public.shelter_forge_swords;v record;pname text;pub uuid;begin if u is null then raise exception'로그인이 필요합니다.';end if;select*into s from public.shelter_forge_swords where user_id=u;if s.sword_level<1 then raise exception'1강 이상의 검만 자랑할 수 있습니다.';end if;select display_name into pname from public.profiles where id=u and terms_accepted_at is not null;if pname is null then raise exception'광장 이용약관 동의 후 공유할 수 있습니다.';end if;select*into v from public.forge_level_value(s.sword_level);update public.profiles set public_profile=true where id=u;insert into public.publications(user_id,source_type,source_id,audience,title,body,meta,published_at)values(u,'forge',gen_random_uuid(),'public',format('+%s강 명검 감정서',s.sword_level),format('%s님의 명검 감정서',pname),jsonb_build_object('forge_event','showcase','sword_level',s.sword_level,'sword_name',s.sword_name,'custom_name',s.custom_name,'appraisal',v.appraisal+s.sharpness_bonus,'hammer_count',s.total_attempts),now())returning id into pub;return jsonb_build_object('publication_id',pub);end$$;

create function public.publish_forge_obituary(p_grave_id bigint)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();g public.shelter_forge_graveyard;pname text;pub uuid;begin if u is null then raise exception'로그인이 필요합니다.';end if;select*into g from public.shelter_forge_graveyard where id=p_grave_id and user_id=u for update;if not found then raise exception'부고 기록을 찾을 수 없습니다.';end if;if g.publication_id is not null then return jsonb_build_object('publication_id',g.publication_id,'already_published',true);end if;select display_name into pname from public.profiles where id=u and terms_accepted_at is not null;if pname is null then raise exception'광장 이용약관 동의 후 공유할 수 있습니다.';end if;update public.profiles set public_profile=true where id=u;insert into public.publications(user_id,source_type,source_id,audience,title,body,meta,published_at)values(u,'forge',gen_random_uuid(),'public',format('故 +%s강 명검 영면하다',g.sword_level),coalesce(g.rip_message,'명검의 묘지에 잠들었습니다.'),jsonb_build_object('forge_event','obituary','sword_level',g.sword_level,'sword_name',g.sword_name,'custom_name',g.custom_name,'appraisal',g.appraisal,'hammer_count',g.hammer_count,'grave_id',g.id),now())returning id into pub;update public.shelter_forge_graveyard set publication_id=pub where id=g.id;return jsonb_build_object('publication_id',pub);end$$;

drop function if exists public.update_forge_preferences(text,boolean);
create or replace function public.update_forge_preferences(p_custom_name text default null,p_share_events boolean default false,p_sound_enabled boolean default true)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=auth.uid();clean text:=nullif(btrim(coalesce(p_custom_name,'')),'');begin if u is null then raise exception'로그인이 필요합니다.';end if;if clean is not null and char_length(clean)>12 then raise exception'검 이름은 12자 이하로 입력해 주세요.';end if;insert into public.shelter_forge_swords(user_id,sword_name,custom_name,sound_enabled)values(u,public.forge_level_name(0),clean,coalesce(p_sound_enabled,true))on conflict(user_id)do update set custom_name=excluded.custom_name,sound_enabled=excluded.sound_enabled,share_events=false,updated_at=now();return public.get_forge_state();end$$;

revoke all on function public.forge_level_name(int),public.forge_level_value(int),public.forge_rates(int),public.resolve_forge_outcome(int,numeric,numeric),public.refresh_forge_stamina(uuid,timestamptz),public.unlock_forge_titles(uuid,int,int) from public,anon,authenticated;
revoke all on function public.get_forge_state(),public.attempt_forge(boolean,boolean,text,numeric),public.claim_forge_tutorial(),public.claim_forge_daily_supply(),public.buy_forge_item(text),public.sell_forge_sword(),public.register_forge_hall(text),public.publish_forge_showcase(),public.publish_forge_obituary(bigint),public.update_forge_preferences(text,boolean,boolean) from public,anon;
grant execute on function public.get_forge_state(),public.attempt_forge(boolean,boolean,text,numeric),public.claim_forge_tutorial(),public.claim_forge_daily_supply(),public.buy_forge_item(text),public.sell_forge_sword(),public.register_forge_hall(text),public.publish_forge_showcase(),public.publish_forge_obituary(bigint),public.update_forge_preferences(text,boolean,boolean) to authenticated;

commit;
