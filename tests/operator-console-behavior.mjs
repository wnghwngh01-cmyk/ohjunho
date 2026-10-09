process.on('uncaughtException',e=>{console.error(e.message,e.where||'');process.exit(1)});
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role; create role authenticator;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true))$$;
grant usage on schema auth to anon,authenticated,service_role; grant execute on all functions in schema auth to anon,authenticated,service_role;
create table storage.objects(id uuid primary key,name text); alter table storage.objects enable row level security;
create table profiles(id uuid primary key references auth.users(id),display_name text,lab_name text,slug text,bio text,public_profile boolean default true);
create table records(id uuid primary key,user_id uuid,category text,title text,body text);
create table client_error_logs(id bigint generated always as identity primary key,user_id uuid,context text,message text,created_at timestamptz default now());
`);
for(const file of ['step5_community.sql','step6_square_categories_and_replies.sql','step12_profile_photos.sql','step13_operator_console.sql','step14_operator_accounts.sql','step15_operator_moderation_hardening.sql']){
 try{await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));console.log('migration OK',file);}catch(e){console.error('migration FAIL',file,e.message);process.exit(1);}
}
const owner='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333',post='44444444-4444-4444-8444-444444444444';
await db.exec(`insert into auth.users(id,email) values('${owner}','owner@test.local'),('${user}','user@test.local'),('${other}','other@test.local');insert into profiles(id,display_name,slug) values('${owner}','owner','owner'),('${user}','user','user'),('${other}','other','other');insert into admin_private.operators(user_id) values('${owner}');insert into publications(id,user_id,source_type,source_id,title,body) values('${post}','${user}','community',gen_random_uuid(),'test','body');`);
async function asUser(id,aal='aal2'){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claim.aal','${aal}',false);set role authenticated;`);}
async function reject(sql,label){let denied=false;try{await db.exec(sql);}catch{denied=true;}assert(denied,label);console.log('PASS',label);}
async function action(name,payload,request=crypto.randomUUID()){return (await db.query('select operator_action($1,$2::jsonb,$3::uuid) value',[name,JSON.stringify(payload),request])).rows[0].value;}
await asUser(user);await reject(`select operator_list('users')`,'ordinary user cannot access admin');await reject('select * from admin_private.operators','operator allowlist inaccessible');
await asUser(owner,'aal1');await reject(`select operator_list('users')`,'owner must use MFA');
await asUser(owner);for(const kind of ['dashboard','users','audit','restrictions','posts','comments','reports','bugs','legacy_bugs','security','ideas','errors','messages'])await db.query('select operator_list($1)',[kind]);console.log('PASS all operator lists execute');
await action('hide',{id:post,kind:'publications',reason:'test moderation'});
await asUser(user);assert.equal((await db.query('select * from get_publication_feed_v2()')).rows.length,0);console.log('PASS hidden post absent from feed');
await asUser(owner);await action('restore',{id:post,kind:'publications',reason:'test restore'});
await asUser(user);assert.equal((await db.query('select * from get_publication_feed_v2()')).rows.length,1);console.log('PASS restored post visible');
await asUser(owner);await action('restrict',{id:user,until:'2099-01-01',reason:'test restriction'});
await asUser(user);await reject(`select add_community_post('blocked')`,'restricted user cannot post via definer RPC');
await asUser(owner);await action('unrestrict',{id:user,reason:'test release'});
const req=crypto.randomUUID();const message={id:user,audience:'one',title:'notice',body:'private notice',reason:'test notice'};await action('message',message,req);await action('message',message,req);
await asUser(other);assert.equal((await db.query('select * from operator_messages')).rows.length,0);console.log('PASS personal notification isolation');
await asUser(user);assert.equal((await db.query("select * from operator_messages where title='notice'")).rows.length,1);console.log('PASS duplicate request sends one notice');
const delivered=(await db.query("select id from operator_messages where title='notice'")).rows[0].id;
await db.query('insert into operator_message_reads(message_id) values($1)',[delivered]);
assert.equal((await db.query('select * from operator_message_reads')).rows.length,1);
await asUser(other);assert.equal((await db.query('select * from operator_message_reads')).rows.length,0);
await reject(`insert into operator_message_reads(message_id) values('${delivered}')`,'cannot mark another recipient message read');
const bug=(await db.query("insert into support_tickets(title,body,screen) values('test bug','details','diary') returning id")).rows[0].id;
await asUser(user);assert.equal((await db.query('select * from support_tickets')).rows.length,0);console.log('PASS private support ticket isolation');
await asUser(owner);await action('case',{id:bug,kind:'bugs',status:'resolved',reason:'resolved in fixture'});
const cases=(await db.query("select operator_list('bugs','','resolved') value")).rows[0].value;assert.equal(cases.length,1);assert.equal(cases[0].operator_note,'resolved in fixture');
await action('message',{audience:'all',title:'everyone',body:'broadcast fixture',reason:'test broadcast'});
await asUser(user);assert.equal((await db.query("select * from operator_messages where title='everyone'")).rows.length,1);
await asUser(other);assert.equal((await db.query("select * from operator_messages where title='everyone'")).rows.length,1);console.log('PASS global message visible to both recipients');
const report=crypto.randomUUID();await db.query("insert into content_reports(id,reporter_id,target_type,target_id,reason) values($1,$2,'publication',$3,'test')",[report,other,post]);
await asUser(user);await db.query("update publications set body='edited' where id=$1",[post]);
await asUser(owner);const snapshot=(await db.query('select operator_report_snapshot($1) value',[report])).rows[0].value;assert.equal(snapshot.content.body,'body');console.log('PASS report snapshot survives source edits');
await action('hide',{id:post,kind:'publications',reason:'hide fixture'});
await asUser(user);assert.equal((await db.query('select * from publications where id=$1',[post])).rows.length,0);console.log('PASS direct table access also hides moderated post');
await asUser(owner);await action('restore',{id:post,kind:'publications',reason:'restore fixture'});
await asUser(other);for(let i=0;i<9;i++)await db.query("insert into support_tickets(title,body) values('rate fixture','details')");
await reject("insert into support_tickets(title,body) values('rate fixture','details')",'support rate limit');
await asUser(owner);await reject(`select operator_account_prepare('${owner}','ban','test')`,'owner protected from ban');await db.query('select operator_account_prepare($1,$2,$3)',[user,'ban','test ban']);
await asUser(user);await reject('select check_operator_account_access()','existing session blocked at API guard');
await db.close();console.log('ALL SQL BEHAVIOR CHECKS PASSED');
