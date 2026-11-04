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
  create table public.profiles(
    id uuid primary key references auth.users(id),display_name text,lab_name text,slug text,avatar_path text,
    public_profile boolean default false,terms_accepted_at timestamptz
  );
  create table public.publications(
    id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
    source_type text not null constraint publications_source_type_check check(source_type in('record','diary','book','community','project','work')),
    source_id uuid not null,audience text not null default 'public',title text not null,body text not null default '',meta jsonb not null default '{}'::jsonb,
    cover_path text,published_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,source_type,source_id)
  );
  create table public.follows(follower_id uuid,following_id uuid,primary key(follower_id,following_id));
  create table public.publication_likes(publication_id uuid references publications(id),user_id uuid,primary key(publication_id,user_id));
  create table public.publication_comments(id uuid primary key default gen_random_uuid(),publication_id uuid references publications(id),user_id uuid,body text,created_at timestamptz default now());
  create table public.blocks(blocker_id uuid,blocked_id uuid,primary key(blocker_id,blocked_id));
`);
const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';
await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
await db.query("insert into profiles(id,display_name,lab_name,slug,public_profile,terms_accepted_at) values($1,'대장장이','불꽃 연구소','smith',false,now()),($2,'관전자','구경 연구소','viewer',true,now())",[a,b]);
await db.exec(fs.readFileSync('supabase/migrations/20261104120000_step29_shelter_forge.sql','utf8'));

async function login(id,service=false){await db.exec(`reset role;set test.uid='${id}';set test.jwt.role='${service?'service_role':'authenticated'}';set role authenticated;`)}
async function attempt(roll,options={}){return (await db.query('select attempt_forge($1,$2,$3,$4) result',[!!options.whetstone,!!options.shield,!!options.bellows,roll])).rows[0].result}

await login(a,true);
let state=(await db.query('select get_forge_state() result')).rows[0].result;
assert.equal(state.sword.sword_level,0);assert.equal(state.sword.share_events,false);

for(const expected of [1,2,3]){state=await attempt(99.99);assert.equal(state.result.outcome,'success');assert.equal(state.sword.sword_level,expected,'0~2강은 난수와 무관하게 100% 성공해야 함')}
state=await attempt(95);assert.equal(state.result.outcome,'stay');assert.equal(state.sword.sword_level,3,'3→4 시도는 90% 성공, 실패 시 유지');

await db.exec('reset role');await db.query('update shelter_forge_swords set sword_level=15,sword_name=forge_level_name(15),shields=1,whetstones=1 where user_id=$1',[a]);
await login(a,true);state=await attempt(40,{shield:true,whetstone:true,bellows:true});
assert.equal(state.result.outcome,'protected_destroy');assert.equal(state.sword.sword_level,14);assert.equal(state.sword.shields,0);assert.equal(state.sword.whetstones,0);

await db.exec('reset role');await db.query('update shelter_forge_swords set sword_level=15,sword_name=forge_level_name(15) where user_id=$1',[a]);
await login(a,true);state=await attempt(40);assert.equal(state.result.outcome,'destroy');assert.equal(state.sword.sword_level,0);assert.equal(state.result.shards_gained,30);
assert.equal((await db.query('select count(*)::int n from shelter_forge_graveyard where user_id=$1',[a])).rows[0].n,1);

await db.exec('reset role');await db.query('update shelter_forge_swords set shards=60 where user_id=$1',[a]);
await login(a,true);state=(await db.query("select exchange_forge_item('whetstone') result")).rows[0].result;assert.equal(state.sword.shards,50);assert.equal(state.sword.whetstones,1);
state=(await db.query("select exchange_forge_item('shield') result")).rows[0].result;assert.equal(state.sword.shards,0);assert.equal(state.sword.shields,1);

state=(await db.query("select update_forge_preferences('불꽃검',true) result")).rows[0].result;assert.equal(state.sword.custom_name,'불꽃검');assert.equal(state.sword.share_events,true);
await db.exec('reset role');await db.query('update shelter_forge_swords set sword_level=14,sword_name=forge_level_name(14) where user_id=$1',[a]);
await login(a,true);state=await attempt(0);assert.equal(state.sword.sword_level,15);
await db.exec('reset role');
const forgePosts=(await db.query("select count(*)::int n from publications where source_type='forge'")).rows[0].n;assert.equal(forgePosts,1,'15강 성공은 공유 옵션이 켜졌을 때만 대장간 게시물을 생성');
await login(a,true);
let feed=(await db.query("select * from get_publication_feed_v2('discover','all',50)")).rows;assert.equal(feed.length,0,'대장간 글은 일반 전체 피드와 섞이면 안 됨');
feed=(await db.query("select * from get_publication_feed_v2('discover','forge',50)")).rows;assert.equal(feed.length,1);assert.equal(feed[0].source_type,'forge');

await db.exec('reset role');
const stats=(await db.query('select * from shelter_forge_global_stats where id=1')).rows[0];assert.equal(Number(stats.total_enhances),7);assert.equal(Number(stats.total_destructions),1);assert.equal(stats.highest_level,15);
await login(a,false);await assert.rejects(()=>db.query('select attempt_forge(false,false,false,0)'),/테스트 난수는 사용할 수 없습니다/);
await assert.rejects(()=>db.query("update shelter_forge_swords set shards=999 where user_id=auth.uid()"),/permission denied/);

await db.close();
console.log('forge DB: PASS (probability, shield, destruction reward, shop, isolated Square feed, write boundary)');
