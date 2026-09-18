import fs from 'node:fs';

const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step5_community.sql',import.meta.url),'utf8');
const deleteFix=fs.readFileSync(new URL('../supabase/step5_community_comment_delete_fix.sql',import.meta.url),'utf8');

for(const name of ['toggleFollow','toggleLike','comments','addComment','deleteComment','blockUser','unblockUser','reportContent','features','addFeature','toggleFeatureVote','submitSecurityReport']){
  if(!db.includes(`function ${name}(`))throw new Error(`Missing community DB operation: ${name}`);
}

for(const id of ['squareTabs','squareFeed','featureList','featureSubmit','securitySubmit','commentSubmit','reportSubmit']){
  if(!html.includes(`id="${id}"`))throw new Error(`Missing community UI control: ${id}`);
}

for(const action of ['data-follow','data-like','data-comments','data-report-type','data-block-user','data-vote']){
  if(!app.includes(action))throw new Error(`Missing community action wiring: ${action}`);
}

for(const table of ['publications','follows','publication_likes','publication_comments','blocks','feature_requests','feature_votes','content_reports','security_reports']){
  if(!migration.includes(`alter table public.${table} enable row level security`))throw new Error(`RLS is not enabled in migration: ${table}`);
}

for(const policy of ['comments_select_own','comments_delete_own']){
  if(!deleteFix.includes(`create policy ${policy}`))throw new Error(`Missing comment cleanup policy: ${policy}`);
}

for(const operation of ['addComment','reportContent','addFeature','submitSecurityReport']){
  const start=db.indexOf(`function ${operation}(`);
  const end=db.indexOf('\n  async function ',start+1);
  const body=db.slice(start,end<0?db.length:end);
  if(/\.insert\([\s\S]*?\)\.select\(/.test(body))throw new Error(`${operation} requests a SELECT response after INSERT`);
}

console.log('community-contract: PASS');
