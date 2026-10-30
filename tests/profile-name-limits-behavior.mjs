import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
await db.exec(`
  create role anon;create role authenticated;
  create table public.profiles(id uuid primary key,display_name text,lab_name text,bio text);
  insert into public.profiles values('00000000-0000-0000-0000-000000000001','기존에저장된아주긴이름','기존에 저장된 아주 긴 연구소 이름','기존 소개');
`);
await db.exec(fs.readFileSync('supabase/step28_profile_name_limits.sql','utf8'));

await db.query("update profiles set bio='새 소개' where id='00000000-0000-0000-0000-000000000001'");
let legacy=(await db.query("select display_name,lab_name,bio from profiles where id='00000000-0000-0000-0000-000000000001'")).rows[0];
assert.equal(legacy.display_name,'기존에저장된아주긴이름');assert.equal(legacy.lab_name,'기존에 저장된 아주 긴 연구소 이름');assert.equal(legacy.bio,'새 소개');
await db.query("update profiles set display_name=display_name,lab_name=lab_name where id='00000000-0000-0000-0000-000000000001'");
await assert.rejects(db.query("update profiles set display_name='123456789' where id='00000000-0000-0000-0000-000000000001'"),/이름은 1~8자/);
await assert.rejects(db.query("update profiles set lab_name='1234567890123' where id='00000000-0000-0000-0000-000000000001'"),/공간 이름은 1~12자/);
await db.query("update profiles set display_name='가나다라마바사아',lab_name='가나다라마바사아자차카타' where id='00000000-0000-0000-0000-000000000001'");
legacy=(await db.query("select display_name,lab_name from profiles where id='00000000-0000-0000-0000-000000000001'")).rows[0];
assert.equal([...legacy.display_name].length,8);assert.equal([...legacy.lab_name].length,12);
await assert.rejects(db.query("insert into profiles values('00000000-0000-0000-0000-000000000002','123456789','공간','')"),/이름은 1~8자/);
await db.query("insert into profiles values('00000000-0000-0000-0000-000000000002','새사용자','새연구소','')");

await db.close();
console.log('profile name limits: PASS (new and changed values limited, legacy values preserved)');
