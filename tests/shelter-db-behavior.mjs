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

const before=(await db.query("select current_shelter_week_key('2026-10-26 14:59:59+00'::timestamptz) key")).rows[0].key;
const after=(await db.query("select current_shelter_week_key('2026-10-26 15:00:00+00'::timestamptz) key")).rows[0].key;
assert.equal(new Date(before).toISOString().slice(0,10),'2026-10-19');assert.equal(new Date(after).toISOString().slice(0,10),'2026-10-26');

async function login(id){await db.exec(`reset role;set test.uid='${id}';set role authenticated;`)}
for(let index=0;index<ids.length;index++){await login(ids[index]);await db.query('select record_shelter_1to25($1)',[8000+index*1000])}
await login(ids[0]);
const slower=(await db.query('select record_shelter_1to25(15000) result')).rows[0].result;
assert.equal(slower.my_best_ms,8000);assert.equal(slower.my_rank,1);assert.equal(slower.total_players,12);
const permanent=(await db.query('select unlocked_titles,shelter_play_count from profiles where id=$1',[ids[0]])).rows[0];
for(const code of ['bronze','silver','gold','diamond','master'])assert.ok(permanent.unlocked_titles.includes(code),code);
assert.equal(permanent.shelter_play_count,2);
await db.query("update profiles set active_title='master' where id=$1",[ids[0]]);const backup=(await db.query('select export_my_data() result')).rows[0].result;assert.equal(backup.profiles[0].active_title,'master');assert.ok(backup.profiles[0].unlocked_titles.includes('master'));await db.query("update profiles set active_title=null,unlocked_titles='[]'::jsonb,shelter_play_count=0 where id=$1",[ids[0]]);await db.query('select restore_my_data($1::jsonb)',[JSON.stringify(backup)]);const restored=(await db.query('select active_title,unlocked_titles,shelter_play_count from profiles where id=$1',[ids[0]])).rows[0];assert.equal(restored.active_title,'master');assert.ok(restored.unlocked_titles.includes('master'));assert.equal(restored.shelter_play_count,2);

const first=(await db.query('select get_shelter_leaderboard() result')).rows[0].result;
assert.equal(first.top10.length,10);assert.equal(first.total_players,12);assert.equal(first.my_rank,1);assert.ok(first.available_titles.includes('weekly_1st'));
for(const [index,title] of [[1,'weekly_2nd'],[2,'weekly_3rd'],[3,'weekly_top10'],[9,'weekly_top10']]){await login(ids[index]);const board=(await db.query('select get_shelter_leaderboard() result')).rows[0].result;assert.equal(board.my_rank,index+1);assert.ok(board.available_titles.includes(title),title)}

await db.exec('reset role');await db.query('update profiles set shelter_play_count=49 where id=$1',[ids[11]]);await login(ids[11]);await db.query('select record_shelter_1to25(19000)');
const regular=(await db.query('select unlocked_titles,shelter_play_count from profiles where id=$1',[ids[11]])).rows[0];assert.equal(regular.shelter_play_count,50);assert.ok(regular.unlocked_titles.includes('regular'));

await db.close();
console.log('shelter DB: PASS (KST week, best, rank, top10, weekly and permanent titles)');
