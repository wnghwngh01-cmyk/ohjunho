import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
const owner='11111111-1111-1111-1111-111111111111';
const commenter='22222222-2222-2222-2222-222222222222';
const publication='33333333-3333-3333-3333-333333333333';
const comment='44444444-4444-4444-4444-444444444444';
const ticket='55555555-5555-5555-5555-555555555555';
const reply='66666666-6666-6666-6666-666666666666';
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create schema admin_private;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id',true),'')::uuid $$;
  create table public.profiles(id uuid primary key,display_name text);
  create table public.publications(id uuid primary key,user_id uuid,title text,body text);
  create table public.publication_comments(id uuid primary key,publication_id uuid,user_id uuid,body text,created_at timestamptz default now());
  create table public.support_tickets(id uuid primary key,user_id uuid);
  create table admin_private.case_replies(id uuid primary key,kind text,case_id uuid,recipient_id uuid,body text,created_at timestamptz default now());
  create function public.operator_content_visible(text,uuid) returns boolean language sql stable as $$ select true $$;
  insert into auth.users values('${owner}'),('${commenter}');
  insert into public.profiles values('${owner}','글쓴이'),('${commenter}','댓글러');
  insert into public.publications values('${publication}','${owner}','내 글','본문');
  insert into public.publication_comments values('${comment}','${publication}','${commenter}','새 댓글입니다',now());
  insert into public.support_tickets values('${ticket}','${owner}');
  insert into admin_private.case_replies values('${reply}','contacts','${ticket}','${owner}','문의 답변입니다',now());
  select set_config('app.user_id','${owner}',false);
`);
await db.exec(fs.readFileSync('supabase/migrations/20261107100000_step37_notifications.sql','utf8'));
let rows=(await db.query(`select public.get_my_activity_notifications() value`)).rows[0].value;
if(typeof rows==='string')rows=JSON.parse(rows);
assert.equal(rows.length,2);
assert.deepEqual(new Set(rows.map(x=>x.kind)),new Set(['comment','support_reply']));
assert.equal(rows.every(x=>x.read===false&&x.dismissed===false),true);

await db.exec(`select public.mark_my_notification('comment:${comment}',false)`);
rows=(await db.query(`select public.get_my_activity_notifications() value`)).rows[0].value;if(typeof rows==='string')rows=JSON.parse(rows);
assert.equal(rows.find(x=>x.kind==='comment').read,true);
await db.exec(`select public.mark_my_notification('comment:${comment}',true)`);
rows=(await db.query(`select public.get_my_activity_notifications() value`)).rows[0].value;if(typeof rows==='string')rows=JSON.parse(rows);
assert.equal(rows.find(x=>x.kind==='comment').dismissed,true);
await db.exec(`select public.mark_all_my_activity_notifications_read()`);
rows=(await db.query(`select public.get_my_activity_notifications() value`)).rows[0].value;if(typeof rows==='string')rows=JSON.parse(rows);
assert.equal(rows.every(x=>x.read),true);

await db.exec(`insert into public.publication_comments values('77777777-7777-7777-7777-777777777777','${publication}','${owner}','내 댓글',now())`);
rows=(await db.query(`select public.get_my_activity_notifications() value`)).rows[0].value;if(typeof rows==='string')rows=JSON.parse(rows);
assert.equal(rows.some(x=>x.source_id==='77777777-7777-7777-7777-777777777777'),false,'자기 댓글은 알림에서 제외해야 한다');

await db.close();
console.log('notifications DB behavior PASS');
