import fs from 'node:fs';

const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step7_data_ownership.sql',import.meta.url),'utf8');
const deletion=fs.readFileSync(new URL('../supabase/functions/delete-account/index.ts',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

if(!db.includes("client.rpc('export_my_data')"))throw new Error('Client does not use the owner-only export RPC');

const exportsByOwner={
  profiles:'id=auth.uid()',records:'user_id=auth.uid()',record_media:'user_id=auth.uid()',events:'user_id=auth.uid()',daily_todos:'user_id=auth.uid()',habits:'user_id=auth.uid()',habit_checks:'user_id=auth.uid()',goals:'user_id=auth.uid()',projects:'user_id=auth.uid()',project_files:'user_id=auth.uid()',ideas:'user_id=auth.uid()',works:'user_id=auth.uid()',finance_transactions:'user_id=auth.uid()',publications:'user_id=auth.uid()',follows:'follower_id=auth.uid()',publication_likes:'user_id=auth.uid()',publication_comments:'user_id=auth.uid()',blocks:'blocker_id=auth.uid()',feature_requests:'user_id=auth.uid()',feature_votes:'user_id=auth.uid()',content_reports:'reporter_id=auth.uid()',security_reports:'user_id=auth.uid()',site_state:'user_id=auth.uid()'
};
for(const [table,predicate] of Object.entries(exportsByOwner)){
  if(!migration.includes(`from public.${table} where ${predicate}`))throw new Error(`Export RPC is missing owner-filtered ${table}`);
}
if(!migration.includes('security definer')||!migration.includes('grant execute on function public.export_my_data() to authenticated'))throw new Error('Export RPC permissions are incomplete');

for(const token of ["getUser()","body?.confirm !== true","'lab-private'", "'lab-public'",'https://test1.ohjunho.com','https://test2.ohjunho.com','admin.auth.admin.deleteUser(user.id)']){
  if(!deletion.includes(token))throw new Error(`Delete function is missing: ${token}`);
}
if(deletion.indexOf("for (const bucket")>deletion.indexOf('admin.auth.admin.deleteUser'))throw new Error('Account is deleted before storage cleanup');
if(!html.includes('기록, 일기, 일정, 목표, 가계부, 업로드 파일과 광장 활동'))throw new Error('Account deletion copy does not describe the current app data');

console.log('data-ownership-contract: PASS');
