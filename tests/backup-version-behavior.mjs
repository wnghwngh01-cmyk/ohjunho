import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
// The same version guard observed in the deployed legacy restore function.
await db.exec(`create function restore_my_data_before_budgets(p_backup jsonb) returns jsonb language plpgsql as $$declare v_version integer;begin v_version:=nullif(p_backup->>'version','')::integer;if v_version <> 3 then raise exception 'unsupported';end if;return p_backup;end$$`);
await assert.rejects(()=>db.query('select restore_my_data_before_budgets($1)',['{"version":4}']));
const migration=fs.readFileSync('supabase/step23e_backup_version_compat.sql','utf8');
await db.exec(migration);await db.exec(migration);
for(const version of [3,4])assert.equal((await db.query('select restore_my_data_before_budgets($1) as result',[JSON.stringify({version})])).rows[0].result.version,version);
for(const version of [null,2,5])await assert.rejects(()=>db.query('select restore_my_data_before_budgets($1)',[JSON.stringify({version})]));
assert.ok(fs.readFileSync('js/app.js','utf8').includes('![3,4].includes(backup.version)'));
await db.close();console.log('backup version compatibility: PASS (v4 reproduced, v3/v4 accepted, unknown rejected, migration repeat)');
