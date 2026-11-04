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

async function login(id,service=false){await db.exec(`reset role;set test.uid='${id}';set test.jwt.role='${service?'service_role':'authenticated'}';set role authenticated;`)}
async function root(sql,params=[]){await db.exec('reset role');return db.query(sql,params)}
async function rpc(sql,params=[]){return (await db.query(sql,params)).rows[0].result}
async function attempt(roll,options={}){return rpc('select attempt_forge($1,$2,$3,$4) result',[!!options.whetstone,!!options.shield,options.grade||'normal',roll])}

await login(a,true);
let state=await rpc('select get_forge_state() result');
assert.equal(state.sword.sword_level,0);assert.equal(state.sword.sword_name,'수련용 목검');assert.equal(state.sword.stamina,5);
let rates=(await root('select * from forge_rates(29)')).rows[0];
assert.equal(Number(rates.success_rate),4.2);assert.equal(Number(rates.stay_rate),68.8);assert.equal(Number(rates.destroy_rate),27);assert.equal(rates.target_name,'창세의 신화검 · 에테르');

await login(a,true);state=await rpc('select claim_forge_tutorial() result');assert.equal(state.sword.points,100);assert.equal(state.sword.shields,1);
await assert.rejects(()=>rpc('select claim_forge_tutorial() result'),/이미 받았습니다/);
state=await rpc('select claim_forge_daily_supply() result');assert.equal(state.sword.points,150);assert.equal(state.sword.shields,2);
await assert.rejects(()=>rpc('select claim_forge_daily_supply() result'),/이미 받았습니다/);

state=await attempt(99.9);assert.equal(state.result.outcome,'success');assert.equal(state.sword.sword_level,1);assert.equal(state.sword.sharpness_bonus,25);
const titles=(await root('select unlocked_titles from profiles where id=$1',[a])).rows[0].unlocked_titles;assert.ok(titles.includes('forge_apprentice'));

await root("update shelter_forge_swords set sword_level=10,sword_name=forge_level_name(10),stamina=5,shields=1,whetstones=1,sharpness_bonus=0 where user_id=$1",[a]);
await login(a,true);state=await attempt(70);assert.equal(state.result.outcome,'stay');assert.equal(state.sword.sword_level,10,'유지 판정은 단계 하락이 없어야 함');
state=await attempt(99,{shield:true});assert.equal(state.result.outcome,'protected_destroy');assert.equal(state.sword.sword_level,10);assert.equal(state.sword.shields,0,'보호권은 시도 즉시 1장 소모');
await root("update shelter_forge_swords set stamina=5 where user_id=$1",[a]);await login(a,true);state=await attempt(99);assert.equal(state.result.outcome,'destroy');assert.equal(state.sword.sword_level,0);assert.equal(state.result.points_gained,100);assert.equal(state.result.shards_gained,2);
assert.equal((await root('select count(*)::int n from shelter_forge_graveyard where user_id=$1',[a])).rows[0].n,1);

await root("update shelter_forge_swords set points=5000,shards=50,stamina=4,whetstones=0,shields=0 where user_id=$1",[a]);await login(a,true);
state=await rpc("select buy_forge_item('stamina_1') result");assert.equal(state.sword.stamina,5);assert.equal(state.sword.points,4950);
state=await rpc("select buy_forge_item('shield_5') result");assert.equal(state.sword.shields,5);assert.equal(state.sword.points,4050);
state=await rpc("select buy_forge_item('shard_whetstone') result");assert.equal(state.sword.shards,40);assert.equal(state.sword.whetstones,1);
state=await rpc("select buy_forge_item('sword_15') result");assert.equal(state.sword.sword_level,15);assert.equal(state.sword.sword_name,'영혼을 베는 에스톡');

await root("update shelter_forge_swords set sharpness_bonus=60 where user_id=$1",[a]);await login(a,true);state=await rpc('select sell_forge_sword() result');assert.equal(state.transaction.points,710);assert.equal(state.sword.sword_level,0);
await root("update shelter_forge_swords set sword_level=20,sword_name=forge_level_name(20),sharpness_bonus=100 where user_id=$1",[a]);await login(a,true);
state=await rpc("select register_forge_hall('태양의 맹세') result");assert.equal(state.transaction.best_updated,true);assert.equal(state.sword.sword_level,0);assert.equal(state.leaderboard[0].custom_name,'태양의 맹세');assert.equal(state.leaderboard[0].appraisal,2100);

await root("update shelter_forge_swords set sword_level=12,sword_name=forge_level_name(12),sharpness_bonus=60 where user_id=$1",[a]);await login(a,true);
const showcase=await rpc('select publish_forge_showcase() result');assert.ok(showcase.publication_id);
const grave=(await root('select id from shelter_forge_graveyard where user_id=$1 order by id desc limit 1',[a])).rows[0];await login(a,true);const obituary=await rpc('select publish_forge_obituary($1) result',[grave.id]);assert.ok(obituary.publication_id);
let feed=(await db.query("select * from get_publication_feed_v2('discover','all',50)")).rows;assert.equal(feed.length,0,'대장간 글은 일반 전체 피드와 섞이면 안 됨');
feed=(await db.query("select * from get_publication_feed_v2('discover','forge',50)")).rows;assert.equal(feed.length,2);assert.deepEqual(new Set(feed.map(row=>row.meta.forge_event)),new Set(['showcase','obituary']));

await root("update shelter_forge_swords set stamina=0,stamina_updated_at=now()-interval '11 minutes' where user_id=$1",[a]);await login(a,true);state=await rpc('select get_forge_state() result');assert.equal(state.sword.stamina,1,'10분당 행동력 1 회복');await login(a,false);
await assert.rejects(()=>db.query("select attempt_forge(false,false,'normal',0)"),/테스트 난수는 사용할 수 없습니다/);
await assert.rejects(()=>db.query("update shelter_forge_swords set points=99999 where user_id=auth.uid()"),/permission denied/);

await db.close();
console.log('forge DB: PASS (exact rates, no downgrade, stamina, rewards, shop, disposal, Hall of Fame, Square isolation, write boundary)');
