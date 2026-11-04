import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
await db.exec(`
  create role anon;create role authenticated;create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
  create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('role',coalesce(nullif(current_setting('test.jwt.role',true),''),'authenticated'))$$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid(),auth.jwt() to anon,authenticated;
  create table public.profiles(id uuid primary key references auth.users(id),display_name text,lab_name text,slug text,avatar_path text,public_profile boolean default false,terms_accepted_at timestamptz,avatar_frame_tier text default 'none',avatar_frame_color text default 'forest',avatar_crown_color text default 'gold',active_title text,unlocked_titles jsonb not null default '[]'::jsonb);
  create table public.publications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),source_type text not null constraint publications_source_type_check check(source_type in('record','diary','book','community','project','work')),source_id uuid not null,audience text not null default 'public',title text not null,body text not null default '',meta jsonb not null default '{}'::jsonb,cover_path text,published_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,source_type,source_id));
  create table public.follows(follower_id uuid,following_id uuid,primary key(follower_id,following_id));
  create table public.publication_likes(publication_id uuid references publications(id),user_id uuid,primary key(publication_id,user_id));
  create table public.publication_comments(id uuid primary key default gen_random_uuid(),publication_id uuid references publications(id),user_id uuid,body text,created_at timestamptz default now());
  create table public.blocks(blocker_id uuid,blocked_id uuid,primary key(blocker_id,blocked_id));
`);
const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';
await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
await db.query("insert into profiles(id,display_name,lab_name,slug,public_profile,terms_accepted_at) values($1,'대장장이','불꽃 연구소','smith',false,now()),($2,'관전자','구경 연구소','viewer',true,now())",[a,b]);
await db.exec(fs.readFileSync('supabase/migrations/20261104120000_step29_shelter_forge.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261104190000_step30_forge_game_remake.sql','utf8'));
await db.query("insert into shelter_forge_graveyard(user_id,author_name,sword_level,sword_name)values($1,'이전 기록',15,forge_level_name(15))",[a]);
await db.exec(fs.readFileSync('supabase/migrations/20261104220000_step31_forge_play_feedback.sql','utf8'));
await db.query("insert into shelter_forge_swords(user_id,sword_name,sharpness_bonus)values($1,forge_level_name(0),100)on conflict(user_id)do update set sharpness_bonus=100",[a]);
await db.query("insert into shelter_forge_best(user_id,sword_level,sword_name,custom_name,appraisal,hammer_count)values($1,5,forge_level_name(5),'이전 명검',195,20)",[a]);
await db.query("insert into shelter_forge_graveyard(user_id,author_name,sword_level,sword_name,appraisal)values($1,'이전 기록',20,forge_level_name(20),2999)",[a]);
const legacyPublication=(await db.query("insert into publications(user_id,source_type,source_id,title,meta)values($1,'forge',gen_random_uuid(),'이전 감정서',jsonb_build_object('sword_level',5,'appraisal',195))returning id",[a])).rows[0].id;
await db.exec(fs.readFileSync('supabase/migrations/20261104223000_step32_forge_appraisal_cleanup.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261104230000_step33_forge_balance_recalibration.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261104233000_step34_forge_shop_price_reduction.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261104234500_step35_forge_empty_anvil_state_fix.sql','utf8'));

async function login(id,service=false){await db.exec(`reset role;set test.uid='${id}';set test.jwt.role='${service?'service_role':'authenticated'}';set role authenticated;`)}
async function root(sql,params=[]){await db.exec('reset role');return db.query(sql,params)}
async function rpc(sql,params=[]){return (await db.query(sql,params)).rows[0].result}
async function attempt(roll,options={}){return rpc('select attempt_forge($1,$2,$3,$4) result',[!!options.whetstone,!!options.shield,options.grade||'normal',roll])}

assert.equal((await root('select sharpness_bonus from shelter_forge_swords where user_id=$1',[a])).rows[0].sharpness_bonus,0);assert.equal((await root('select appraisal from shelter_forge_best where user_id=$1',[a])).rows[0].appraisal,35);assert.equal((await root('select appraisal from shelter_forge_graveyard where user_id=$1',[a])).rows[0].appraisal,2000);assert.equal((await root("select (meta->>'appraisal')::int appraisal from publications where id=$1",[legacyPublication])).rows[0].appraisal,35);
await root('delete from publications where id=$1',[legacyPublication]);
await root('delete from shelter_forge_best');await root('delete from shelter_forge_graveyard');assert.equal((await root('select count(*)::int n from shelter_forge_graveyard')).rows[0].n,0,'20강 미만 기존 묘지 데이터 정리');
let rates=(await root('select * from forge_rates(29)')).rows[0];
assert.deepEqual([Number(rates.success_rate),Number(rates.stay_rate),Number(rates.destroy_rate)],[1,72,27]);
const expectedSuccess=[100,95,90,85,80,75,70,65,60,55,50,45,40,35,30,26,22,19,16,13,10.5,8.5,7,5.5,4.5,3.5,2.7,2,1.5,1];
const expectedStay=[0,5,10,14,18,22,26,30,34,38,42,46,50,54,58,61,64,66,68,70,71.5,72.5,73,73.5,73.5,73.5,73.3,73,72.5,72];
const expectedDestroy=[0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27];
const allRates=(await root('select level,success_rate,stay_rate,destroy_rate from generate_series(0,29) level cross join lateral forge_rates(level) order by level')).rows;
assert.deepEqual(allRates.map(row=>Number(row.success_rate)),expectedSuccess);assert.deepEqual(allRates.map(row=>Number(row.stay_rate)),expectedStay);assert.deepEqual(allRates.map(row=>Number(row.destroy_rate)),expectedDestroy);assert.ok(allRates.every(row=>Number(row.success_rate)+Number(row.stay_rate)+Number(row.destroy_rate)===100));
let values=(await root('select * from forge_level_value(30)')).rows[0];assert.deepEqual([values.appraisal,values.compensation,values.shards],[16000,1600,12]);

await login(a,true);let state=await rpc('select get_forge_state() result');
assert.equal(state.sword.has_sword,true);assert.equal(state.sword.stamina,5);assert.equal(state.history.length,0);
state=await rpc('select claim_forge_tutorial() result');assert.equal(state.sword.points,100);assert.equal(state.sword.shields,1);
state=await rpc('select claim_forge_daily_supply() result');assert.equal(state.sword.points,150);assert.equal(state.sword.shields,2);

state=await attempt(99.9,{grade:'perfect'});assert.equal(state.result.outcome,'success');assert.equal(state.sword.sword_level,1);assert.equal(state.sword.stamina,5,'담금질은 풀무 기운을 쓰지 않음');assert.equal(state.sword.sharpness_bonus,0);assert.equal(state.sword.appraisal,2,'타이밍은 감정가에 더하지 않음');
await root("update shelter_forge_swords set sword_level=10,sword_name=forge_level_name(10),stamina=5,shields=1,whetstones=1 where user_id=$1",[a]);await login(a,true);
state=await attempt(99,{shield:true});assert.equal(state.result.outcome,'protected_destroy');assert.equal(state.sword.sword_level,10);assert.equal(state.sword.stamina,5);assert.equal(state.sword.shields,0);
state=await attempt(99);assert.equal(state.result.outcome,'destroy');assert.equal(state.result.points_gained,20);assert.equal(state.sword.has_sword,false);assert.equal(state.sword.stamina,5);assert.equal((await root('select count(*)::int n from shelter_forge_graveyard')).rows[0].n,0,'20강 미만 파괴는 묘지에 안장하지 않음');
state=await rpc('select get_forge_state() result');assert.equal(state.sword.has_sword,false);assert.equal(state.rates,null,'빈 모루 상태에서는 미할당 확률 레코드를 읽지 않음');
await login(a,true);await assert.rejects(()=>attempt(0),/모루 위에 검이 없습니다/);

await root("update shelter_forge_swords set stamina=5,stamina_updated_at=now()-interval '4 minutes' where user_id=$1",[a]);await login(a,true);state=await rpc('select draw_forge_sword() result');assert.equal(state.sword.has_sword,true);assert.equal(state.sword.stamina,4);let stamp=state.sword.stamina_updated_at;
state=await attempt(0);assert.equal(state.sword.sword_level,1);state=await rpc('select sell_forge_sword() result');assert.equal(state.transaction.points,2);assert.equal(state.sword.has_sword,false);
await root("update shelter_forge_swords set stamina=3,stamina_updated_at=now()-interval '4 minutes' where user_id=$1",[a]);let before=(await root('select stamina_updated_at from shelter_forge_swords where user_id=$1',[a])).rows[0].stamina_updated_at;await login(a,true);state=await rpc('select draw_forge_sword() result');assert.equal(state.sword.stamina,2);assert.equal(new Date(state.sword.stamina_updated_at).getTime(),new Date(before).getTime(),'5 미만에서 목검을 꺼내면 회복 타이머 유지');

await root("update shelter_forge_swords set points=20000,shards=50,whetstones=0,stamina=2,stamina_updated_at=now()-interval '4 minutes' where user_id=$1",[a]);before=(await root('select stamina_updated_at from shelter_forge_swords where user_id=$1',[a])).rows[0].stamina_updated_at;await login(a,true);
state=await rpc("select buy_forge_item('stamina_1') result");assert.equal(state.sword.stamina,3);assert.equal(state.sword.points,19880);assert.equal(new Date(state.sword.stamina_updated_at).getTime(),new Date(before).getTime(),'구매 후 5 미만이면 타이머 유지');
state=await rpc("select buy_forge_item('shield_5') result");assert.equal(state.sword.shields,5);assert.equal(state.sword.points,18980);
state=await rpc("select buy_forge_item('whetstone_1') result");assert.equal(state.sword.whetstones,1);assert.equal(state.sword.points,18880);
state=await rpc("select buy_forge_item('sword_20') result");assert.equal(state.sword.has_sword,true);assert.equal(state.sword.sword_level,20);assert.equal(state.sword.points,15880);
state=await rpc("select buy_forge_item('shard_shield') result");assert.equal(state.sword.shields,6);assert.equal(state.sword.shards,25);

await root("update shelter_forge_swords set sharpness_bonus=999,stamina=0 where user_id=$1",[a]);await login(a,true);state=await attempt(99);assert.equal(state.result.outcome,'destroy');assert.equal(state.result.points_gained,200);assert.equal(state.sword.has_sword,false);assert.equal(state.sword.points,16080);assert.equal(state.sword.sharpness_bonus,0);assert.equal((await root('select count(*)::int n from shelter_forge_graveyard where user_id=$1',[a])).rows[0].n,1);

await root("update shelter_forge_swords set has_sword=true,sword_level=20,sword_name=forge_level_name(20),sharpness_bonus=999 where user_id=$1",[a]);await login(a,true);state=await rpc("select register_forge_hall('태양의 맹세') result");assert.equal(state.transaction.appraisal,2000);assert.equal(state.sword.has_sword,false);assert.equal(state.leaderboard[0].appraisal,2000);
await root("update shelter_forge_swords set has_sword=true,sword_level=12,sword_name=forge_level_name(12),sharpness_bonus=999 where user_id=$1",[a]);await login(a,true);const showcase=await rpc('select publish_forge_showcase() result');const post=(await root('select meta from publications where id=$1',[showcase.publication_id])).rows[0];assert.equal(post.meta.appraisal,330);
const grave=(await root('select id from shelter_forge_graveyard where user_id=$1 limit 1',[a])).rows[0];await login(a,true);await rpc('select publish_forge_obituary($1) result',[grave.id]);let feed=(await db.query("select * from get_publication_feed_v2('discover','all',50)")).rows;assert.equal(feed.length,0);feed=(await db.query("select * from get_publication_feed_v2('discover','forge',50)")).rows;assert.equal(feed.length,2);

await root("insert into shelter_forge_attempts(user_id,level_before,level_after,outcome,success_rate,destroy_rate)select $1,0,1,'success',100,0 from generate_series(1,25)",[a]);await login(a,true);state=await rpc('select get_forge_state() result');assert.equal(state.history.length,20,'내 기록은 최근 20개만 반환');
await login(a,false);await assert.rejects(()=>db.query("select attempt_forge(false,false,'normal',0)"),/테스트 난수는 사용할 수 없습니다/);await assert.rejects(()=>db.query("update shelter_forge_swords set points=99999 where user_id=auth.uid()"),/permission denied/);

await db.close();
console.log('forge DB: PASS (empty anvil, draw-only stamina, timer preservation, exact rates/rewards, base appraisal, 20+ graveyard, compact history, write boundary)');
