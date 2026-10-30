import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
await db.exec(`
  create role anon;create role authenticated;create schema auth;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
  create table public.profiles(
    id uuid primary key,display_name text,lab_name text,avatar_path text,avatar_frame_tier text default 'none',avatar_frame_color text default 'sage',avatar_crown_color text,public_profile boolean default false
  );
  create function public.export_my_data() returns jsonb language plpgsql security definer as $$begin return jsonb_build_object('version',4,'profiles',jsonb_build_array(jsonb_build_object('id',auth.uid())));end$$;
  create function public.restore_my_data(p_backup jsonb) returns jsonb language plpgsql security definer as $$begin return jsonb_build_object('restored',0);end$$;
  grant select,update on public.profiles to authenticated;
  grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
`);
const ids=Array.from({length:12},(_,index)=>`00000000-0000-0000-0000-${String(index+1).padStart(12,'0')}`);
for(let index=0;index<ids.length;index++)await db.query('insert into profiles(id,display_name,lab_name,public_profile) values($1,$2,$3,true)',[ids[index],`사용자${index+1}`,`하루${index+1}`]);
await db.exec(fs.readFileSync('supabase/step26_shelter_1to25.sql','utf8'));
await db.exec(fs.readFileSync('supabase/step27_shelter_weekly_settlement.sql','utf8'));

const isoDate=value=>new Date(value).toISOString().slice(0,10);
const addDays=(value,days)=>{const date=new Date(`${value}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)};
const before=(await db.query("select current_shelter_week_key('2026-10-26 14:59:59+00'::timestamptz) key")).rows[0].key;
const after=(await db.query("select current_shelter_week_key('2026-10-26 15:00:00+00'::timestamptz) key")).rows[0].key;
assert.equal(isoDate(before),'2026-10-19');assert.equal(isoDate(after),'2026-10-26');

async function login(id){await db.exec(`reset role;set test.uid='${id}';set role authenticated;`)}
await db.exec('reset role');
await db.query('select settle_shelter_weekly_titles(now())');
await db.query('update profiles set shelter_play_count=49 where id=$1',[ids[11]]);

for(let index=0;index<ids.length;index++){
  await login(ids[index]);
  const result=(await db.query('select record_shelter_1to25($1) result',[8000+index*1000])).rows[0].result;
  assert.deepEqual(result.new_titles,[],'play must not unlock a title immediately');
  assert.equal(result.expected_grade,index<2?'master':index<5?'diamond':index<9?'gold':index<12?'silver':'bronze');
}
await login(ids[0]);
const slower=(await db.query('select record_shelter_1to25(15000) result')).rows[0].result;
assert.equal(slower.my_best_ms,8000);assert.equal(slower.my_rank,1);assert.equal(slower.total_players,12);assert.equal(slower.expected_grade,'gold');
let profile=(await db.query('select unlocked_titles,shelter_play_count from profiles where id=$1',[ids[0]])).rows[0];
assert.deepEqual(profile.unlocked_titles,[]);assert.equal(profile.shelter_play_count,2);
await assert.rejects(db.query("update profiles set active_title='weekly_1st' where id=$1",[ids[0]]),/profiles_active_title_check/);

const liveBoard=(await db.query('select get_shelter_leaderboard() result')).rows[0].result;
assert.equal(liveBoard.top10.length,10);assert.equal(liveBoard.total_players,12);assert.equal(liveBoard.my_rank,1);
assert.deepEqual(liveBoard.available_titles,[],'live rank must not be an available title');
assert.equal(liveBoard.top10[0].expected_rank_title,'weekly_1st');assert.equal(liveBoard.top10[0].expected_grade,'master');
assert.equal(liveBoard.top10[9].expected_rank_title,'weekly_top10');

await db.exec('reset role');
const currentWeek=isoDate((await db.query('select current_shelter_week_key() key')).rows[0].key);
const firstSettlementAt=`${addDays(currentWeek,8)}T00:00:00+09:00`;
const firstSettlement=(await db.query('select settle_shelter_weekly_titles($1) result',[firstSettlementAt])).rows[0].result;
assert.ok(firstSettlement.settled_weeks.includes(currentWeek));
profile=(await db.query('select unlocked_titles,shelter_play_count from profiles where id=$1',[ids[0]])).rows[0];
for(const code of ['bronze','silver','gold','diamond','master','weekly_1st'])assert.ok(profile.unlocked_titles.includes(code),code);
const regular=(await db.query('select unlocked_titles,shelter_play_count from profiles where id=$1',[ids[11]])).rows[0];
assert.equal(regular.shelter_play_count,50);assert.ok(regular.unlocked_titles.includes('regular'));assert.ok(regular.unlocked_titles.includes('bronze'));
for(const [index,title] of [[1,'weekly_2nd'],[2,'weekly_3rd'],[3,'weekly_top10'],[9,'weekly_top10']]){
  const row=(await db.query('select unlocked_titles from profiles where id=$1',[ids[index]])).rows[0];assert.ok(row.unlocked_titles.includes(title),title);
}

await db.query("update profiles set active_title='weekly_1st' where id=$1",[ids[0]]);
const nextWeek=addDays(currentWeek,7);
const nextTimes=[25000,7000,8000,9000,10000,11000,12000,13000,14000,15000,16000,26000];
for(let index=0;index<ids.length;index++)await db.query('insert into shelter_weekly_best(user_id,week_key,best_ms,updated_at) values($1,$2,$3,$4)',[ids[index],nextWeek,nextTimes[index],`${addDays(nextWeek,1)}T00:00:${String(index).padStart(2,'0')}Z`]);
const secondSettlementAt=`${addDays(nextWeek,8)}T00:00:00+09:00`;
await db.query('select settle_shelter_weekly_titles($1)',[secondSettlementAt]);
const formerWinner=(await db.query('select active_title,unlocked_titles from profiles where id=$1',[ids[0]])).rows[0];
assert.equal(formerWinner.active_title,null);assert.ok(!formerWinner.unlocked_titles.some(code=>code.startsWith('weekly_')));assert.ok(formerWinner.unlocked_titles.includes('master'),'tier title must remain permanent');
const newWinner=(await db.query('select unlocked_titles from profiles where id=$1',[ids[1]])).rows[0];
assert.ok(newWinner.unlocked_titles.includes('weekly_1st'));assert.ok(!newWinner.unlocked_titles.includes('weekly_2nd'));
await db.query("update profiles set active_title='weekly_1st',public_profile=false where id=$1",[ids[1]]);

await login(ids[0]);
const cosmetic=(await db.query('select * from get_avatar_frames_v2($1::uuid[])',[[ids[1]]])).rows[0];
assert.equal(cosmetic.id,ids[1]);assert.equal(cosmetic.active_title,'weekly_1st','cosmetics must be visible even when public_profile is false');
await db.query("update profiles set active_title='master' where id=$1",[ids[0]]);
const backup=(await db.query('select export_my_data() result')).rows[0].result;
await db.query("update profiles set active_title=null,unlocked_titles='[]'::jsonb,shelter_play_count=0 where id=$1",[ids[0]]);
await db.query('select restore_my_data($1::jsonb)',[JSON.stringify(backup)]);
const restored=(await db.query('select active_title,unlocked_titles,shelter_play_count from profiles where id=$1',[ids[0]])).rows[0];
assert.equal(restored.active_title,'master');assert.ok(restored.unlocked_titles.includes('master'));assert.equal(restored.shelter_play_count,2);

await db.exec('reset role');
const settlements=(await db.query('select week_key from shelter_weekly_settlements order by week_key')).rows.map(row=>isoDate(row.week_key));
assert.ok(settlements.includes(currentWeek));assert.ok(settlements.includes(nextWeek));
await db.close();
console.log('shelter DB: PASS (deferred settlement, rank rotation, permanent tiers, owned-title constraint)');
