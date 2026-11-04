begin;

create table if not exists public.shelter_forge_swords (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sword_level int not null default 0 check (sword_level between 0 and 30),
  sword_name varchar(24) not null default '녹슨 수련검',
  custom_name varchar(12),
  shards int not null default 0 check (shards>=0),
  whetstones int not null default 0 check (whetstones>=0),
  shields int not null default 0 check (shields>=0),
  max_level_reached int not null default 0 check (max_level_reached between 0 and 30),
  total_attempts int not null default 0 check (total_attempts>=0),
  total_destructions int not null default 0 check (total_destructions>=0),
  share_events boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.shelter_forge_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  level_before int not null,
  level_after int not null,
  outcome text not null check (outcome in ('success','stay','downgrade','destroy','protected_destroy')),
  success_rate numeric(5,2) not null,
  destroy_rate numeric(5,2) not null,
  bellows_bonus boolean not null default false,
  used_whetstone boolean not null default false,
  used_shield boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shelter_forge_attempts_user_created_idx
  on public.shelter_forge_attempts(user_id,created_at desc);

create table if not exists public.shelter_forge_graveyard (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name varchar(30) not null,
  sword_level int not null check (sword_level between 15 and 30),
  sword_name varchar(24) not null,
  custom_name varchar(12),
  rip_message varchar(100),
  publication_id uuid references public.publications(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists shelter_forge_graveyard_created_idx
  on public.shelter_forge_graveyard(created_at desc);

create table if not exists public.shelter_forge_global_stats (
  id int primary key default 1 check (id=1),
  total_enhances bigint not null default 0 check (total_enhances>=0),
  total_destructions bigint not null default 0 check (total_destructions>=0),
  highest_level int not null default 0 check (highest_level between 0 and 30),
  mythic_created_count int not null default 0 check (mythic_created_count>=0),
  updated_at timestamptz not null default now()
);
insert into public.shelter_forge_global_stats(id) values(1) on conflict(id) do nothing;

alter table public.shelter_forge_swords enable row level security;
alter table public.shelter_forge_attempts enable row level security;
alter table public.shelter_forge_graveyard enable row level security;
alter table public.shelter_forge_global_stats enable row level security;

drop policy if exists forge_sword_read_own on public.shelter_forge_swords;
create policy forge_sword_read_own on public.shelter_forge_swords for select to authenticated using(user_id=auth.uid());
drop policy if exists forge_attempts_read_own on public.shelter_forge_attempts;
create policy forge_attempts_read_own on public.shelter_forge_attempts for select to authenticated using(user_id=auth.uid());
drop policy if exists forge_graveyard_read on public.shelter_forge_graveyard;
create policy forge_graveyard_read on public.shelter_forge_graveyard for select to authenticated using(true);
drop policy if exists forge_global_stats_read on public.shelter_forge_global_stats;
create policy forge_global_stats_read on public.shelter_forge_global_stats for select to authenticated using(true);

revoke all on public.shelter_forge_swords,public.shelter_forge_attempts,public.shelter_forge_graveyard,public.shelter_forge_global_stats from public,anon,authenticated;
grant select on public.shelter_forge_swords,public.shelter_forge_attempts,public.shelter_forge_graveyard,public.shelter_forge_global_stats to authenticated;

create or replace function public.forge_level_name(p_level int)
returns text language sql immutable set search_path=public,pg_temp as $$
  select case
    when p_level>=30 then '신화의 천상검'
    when p_level>=25 then '태양의 황금검'
    when p_level>=20 then '심연의 뇌전검'
    when p_level>=15 then '푸른 용살검'
    when p_level>=10 then '기사단의 명검'
    when p_level>=5 then '단련된 강철검'
    else '녹슨 수련검'
  end
$$;

create or replace function public.forge_rates(p_level int)
returns table(success_rate numeric,destroy_rate numeric,failure_kind text)
language plpgsql immutable set search_path=public,pg_temp as $$
declare
  successes int[]:=array[100,100,100,90,80,75,70,65,60,50,48,45,42,40,35,32,30,27,25,20,18,16,14,12,10,8,6,4,3,2];
  destroys int[]:=array[0,0,0,0,5,6,7,8,10,10,11,12,13,15,15,16,17,18,20,25,26,27,28,30,30,32,34,36,37,38];
begin
  if p_level<0 or p_level>29 then raise exception '강화 가능한 레벨이 아닙니다.'; end if;
  return query select successes[p_level+1]::numeric,destroys[p_level+1]::numeric,
    case when p_level<=8 then 'stay' else 'downgrade' end;
end $$;

create or replace function public.resolve_forge_outcome(p_level int,p_roll numeric,p_bonus numeric default 0)
returns text language plpgsql immutable set search_path=public,pg_temp as $$
declare r record; success_value numeric;
begin
  if p_roll<0 or p_roll>=100 then raise exception '강화 난수 범위가 올바르지 않습니다.'; end if;
  select * into r from public.forge_rates(p_level);
  success_value:=least(100-r.destroy_rate,r.success_rate+greatest(0,least(coalesce(p_bonus,0),4)));
  if p_roll<success_value then return 'success'; end if;
  if p_roll<success_value+r.destroy_rate then return 'destroy'; end if;
  return r.failure_kind;
end $$;

create or replace function public.get_forge_state()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); sword public.shelter_forge_swords; rates record; history jsonb; graves jsonb; stats jsonb;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  insert into public.shelter_forge_swords(user_id) values(u) on conflict(user_id) do nothing;
  select * into sword from public.shelter_forge_swords where user_id=u;
  if sword.sword_level<30 then select * into rates from public.forge_rates(sword.sword_level); end if;
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc),'[]'::jsonb) into history
  from (select * from public.shelter_forge_attempts where user_id=u order by created_at desc limit 30) row_data;
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc),'[]'::jsonb) into graves
  from (select g.*,coalesce((select count(*) from public.publication_likes l where l.publication_id=g.publication_id),0) as rip_count
        from public.shelter_forge_graveyard g order by g.created_at desc limit 50) row_data;
  select to_jsonb(s) into stats from public.shelter_forge_global_stats s where id=1;
  return jsonb_build_object('sword',to_jsonb(sword),'rates',case when sword.sword_level<30 then jsonb_build_object('success',rates.success_rate,'destroy',rates.destroy_rate,'failure_kind',rates.failure_kind) else null end,'history',history,'graveyard',graves,'stats',stats);
end $$;

create or replace function public.update_forge_preferences(p_custom_name text default null,p_share_events boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); clean_name text:=nullif(btrim(coalesce(p_custom_name,'')),'');
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  if clean_name is not null and char_length(clean_name)>12 then raise exception '검 이름은 12자 이하로 입력해 주세요.'; end if;
  insert into public.shelter_forge_swords(user_id,custom_name,share_events) values(u,clean_name,coalesce(p_share_events,false))
  on conflict(user_id) do update set custom_name=excluded.custom_name,share_events=excluded.share_events,updated_at=now();
  return public.get_forge_state();
end $$;

create or replace function public.exchange_forge_item(p_item text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); sword public.shelter_forge_swords; cost int;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  insert into public.shelter_forge_swords(user_id) values(u) on conflict(user_id) do nothing;
  select * into sword from public.shelter_forge_swords where user_id=u for update;
  cost:=case p_item when 'whetstone' then 10 when 'shield' then 50 else null end;
  if cost is null then raise exception '교환할 물품을 확인해 주세요.'; end if;
  if sword.shards<cost then raise exception '검의 파편이 부족합니다.'; end if;
  update public.shelter_forge_swords set shards=shards-cost,
    whetstones=whetstones+case when p_item='whetstone' then 1 else 0 end,
    shields=shields+case when p_item='shield' then 1 else 0 end,updated_at=now() where user_id=u;
  return public.get_forge_state();
end $$;

create or replace function public.attempt_forge(
  p_use_whetstone boolean default false,
  p_use_shield boolean default false,
  p_bellows_bonus boolean default false,
  p_test_roll numeric default null
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid(); sword public.shelter_forge_swords; rates record; result_kind text; roll_value numeric;
  bonus numeric:=0; next_level int; reward_shards int:=0; pub_id uuid; event_id uuid:=gen_random_uuid();
  display_name text; can_share boolean:=false; result_state jsonb;
begin
  if u is null then raise exception '로그인이 필요합니다.'; end if;
  insert into public.shelter_forge_swords(user_id) values(u) on conflict(user_id) do nothing;
  select * into sword from public.shelter_forge_swords where user_id=u for update;
  if sword.sword_level>=30 then raise exception '이미 최종 신화 등급에 도달했습니다.'; end if;
  if p_use_whetstone and sword.whetstones<1 then raise exception '보유한 숫돌이 없습니다.'; end if;
  if p_use_shield and sword.shields<1 then raise exception '보유한 보호권이 없습니다.'; end if;
  if p_test_roll is not null and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception '테스트 난수는 사용할 수 없습니다.'; end if;
  select * into rates from public.forge_rates(sword.sword_level);
  bonus:=(case when p_use_whetstone then 2 else 0 end)+(case when p_bellows_bonus then 2 else 0 end);
  roll_value:=coalesce(p_test_roll,random()*100);
  result_kind:=public.resolve_forge_outcome(sword.sword_level,roll_value,bonus);
  next_level:=sword.sword_level;
  if result_kind='success' then next_level:=sword.sword_level+1;
  elsif result_kind='downgrade' then next_level:=greatest(0,sword.sword_level-1);
  elsif result_kind='destroy' and p_use_shield then result_kind:='protected_destroy';next_level:=greatest(0,sword.sword_level-1);
  elsif result_kind='destroy' then reward_shards:=sword.sword_level*2;next_level:=0;
  end if;

  select p.display_name,(sword.share_events and p.terms_accepted_at is not null) into display_name,can_share from public.profiles p where p.id=u;
  update public.shelter_forge_swords set
    sword_level=next_level,sword_name=public.forge_level_name(next_level),
    custom_name=case when result_kind='destroy' then null else custom_name end,
    shards=shards+reward_shards,whetstones=whetstones-case when p_use_whetstone then 1 else 0 end,
    shields=shields-case when p_use_shield then 1 else 0 end,
    max_level_reached=greatest(max_level_reached,next_level),total_attempts=total_attempts+1,
    total_destructions=total_destructions+case when result_kind='destroy' then 1 else 0 end,updated_at=now()
  where user_id=u;

  insert into public.shelter_forge_attempts(user_id,level_before,level_after,outcome,success_rate,destroy_rate,bellows_bonus,used_whetstone,used_shield)
  values(u,sword.sword_level,next_level,result_kind,least(100-rates.destroy_rate,rates.success_rate+bonus),rates.destroy_rate,p_bellows_bonus,p_use_whetstone,p_use_shield);

  update public.shelter_forge_global_stats set total_enhances=total_enhances+1,
    total_destructions=total_destructions+case when result_kind='destroy' then 1 else 0 end,
    highest_level=greatest(highest_level,next_level),
    mythic_created_count=mythic_created_count+case when result_kind='success' and next_level=30 then 1 else 0 end,updated_at=now() where id=1;

  if can_share and result_kind='success' and next_level>=15 then
    update public.profiles set public_profile=true where id=u;
    insert into public.publications(user_id,source_type,source_id,audience,title,body,meta,published_at)
    values(u,'forge',event_id,'public',format('+%s강 달성',next_level),format('축하합니다! %s님이 +%s강 달성에 성공했습니다!',coalesce(display_name,'사용자'),next_level),
      jsonb_build_object('forge_event','success','sword_level',next_level,'sword_name',public.forge_level_name(next_level)),now()) returning id into pub_id;
  elsif can_share and result_kind='destroy' and sword.sword_level>=15 then
    update public.profiles set public_profile=true where id=u;
    insert into public.publications(user_id,source_type,source_id,audience,title,body,meta,published_at)
    values(u,'forge',event_id,'public',format('+%s강 명검의 부고',sword.sword_level),format('명검의 묘지에 +%s %s이(가) 잠들었습니다.',sword.sword_level,coalesce(sword.custom_name,sword.sword_name)),
      jsonb_build_object('forge_event','destroy','sword_level',sword.sword_level,'sword_name',sword.sword_name,'custom_name',sword.custom_name),now()) returning id into pub_id;
  end if;
  if result_kind='destroy' and sword.sword_level>=15 then
    insert into public.shelter_forge_graveyard(user_id,author_name,sword_level,sword_name,custom_name,rip_message,publication_id)
    values(u,coalesce(display_name,'사용자'),sword.sword_level,sword.sword_name,sword.custom_name,'수많은 불꽃 속에서 잠들다.',pub_id);
  end if;
  result_state:=public.get_forge_state();
  return result_state||jsonb_build_object('result',jsonb_build_object('outcome',result_kind,'level_before',sword.sword_level,'level_after',next_level,'shards_gained',reward_shards,'bellows_bonus',p_bellows_bonus,'used_whetstone',p_use_whetstone,'used_shield',p_use_shield));
end $$;

alter table public.publications drop constraint if exists publications_source_type_check;
alter table public.publications add constraint publications_source_type_check
  check(source_type in ('record','diary','book','community','forge','project','work'));

drop function if exists public.get_publication_feed_v2(text,text,integer);
create function public.get_publication_feed_v2(p_mode text default 'discover',p_category text default 'all',p_limit integer default 50)
returns table(id uuid,user_id uuid,source_type text,source_id uuid,audience text,title text,body text,meta jsonb,cover_path text,published_at timestamptz,display_name text,lab_name text,slug text,avatar_path text,following_author boolean,liked_by_me boolean,like_count bigint,comment_count bigint)
language sql security definer set search_path=public,pg_temp stable as $$
  select p.id,p.user_id,p.source_type,p.source_id,p.audience,p.title,p.body,p.meta,p.cover_path,p.published_at,
    coalesce(pr.display_name,'사용자'),coalesce(pr.lab_name,'하루를 담다'),pr.slug,pr.avatar_path,
    exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.user_id),
    exists(select 1 from public.publication_likes l where l.publication_id=p.id and l.user_id=auth.uid()),
    (select count(*) from public.publication_likes l where l.publication_id=p.id),
    (select count(*) from public.publication_comments c where c.publication_id=p.id)
  from public.publications p join public.profiles pr on pr.id=p.user_id
  where pr.public_profile=true and p.source_type in ('record','diary','book','community','forge')
    and ((p_category='all' and p.source_type<>'forge') or p.source_type=p_category)
    and (p.audience='public' or p.user_id=auth.uid())
    and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=auth.uid()))
    and (p_mode<>'following' or (p.user_id<>auth.uid() and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.user_id)))
  order by p.published_at desc limit least(greatest(coalesce(p_limit,50),1),100)
$$;

revoke all on function public.forge_level_name(int),public.forge_rates(int),public.resolve_forge_outcome(int,numeric,numeric) from public,anon,authenticated;
revoke all on function public.get_forge_state(),public.update_forge_preferences(text,boolean),public.exchange_forge_item(text),public.attempt_forge(boolean,boolean,boolean,numeric),public.get_publication_feed_v2(text,text,integer) from public,anon;
grant execute on function public.get_forge_state(),public.update_forge_preferences(text,boolean),public.exchange_forge_item(text),public.attempt_forge(boolean,boolean,boolean,numeric),public.get_publication_feed_v2(text,text,integer) to authenticated;

commit;
