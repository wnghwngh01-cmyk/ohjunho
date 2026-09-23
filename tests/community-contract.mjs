import fs from 'node:fs';

const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step5_community.sql',import.meta.url),'utf8');
const deleteFix=fs.readFileSync(new URL('../supabase/step5_community_comment_delete_fix.sql',import.meta.url),'utf8');
const squareV2=fs.readFileSync(new URL('../supabase/step6_square_categories_and_replies.sql',import.meta.url),'utf8');

for(const name of ['toggleFollow','toggleLike','comments','addComment','deleteComment','blockUser','unblockUser','reportContent','features','addFeature','toggleFeatureVote','submitSecurityReport']){
  if(!db.includes(`function ${name}(`))throw new Error(`Missing community DB operation: ${name}`);
}

for(const id of ['squareTabs','squareCategories','squareFeed','communityPostBody','communityPostSubmit','featureList','featureSubmit','securitySubmit','reportSubmit']){
  if(!html.includes(`id="${id}"`))throw new Error(`Missing community UI control: ${id}`);
}

for(const action of ['data-follow','data-like','data-comments','data-reply-comment','data-submit-comment','data-report-type','data-block-user','data-vote']){
  if(!app.includes(action))throw new Error(`Missing community action wiring: ${action}`);
}

for(const type of ['record','diary','book','community'])if(!squareV2.includes(`'${type}'`))throw new Error(`Missing Square category: ${type}`);
for(const fn of ['get_publication_feed_v2','get_publication_comments_v2','add_publication_comment','share_record_to_square','add_community_post'])if(!squareV2.includes(`function public.${fn}`))throw new Error(`Missing Square migration function: ${fn}`);
if(squareV2.includes('delete from public.publications'))throw new Error('Square migration must preserve retired publication rows');
for(const rpc of ['share_record_to_square','add_community_post'])if(!db.includes(`client.rpc('${rpc}'`))throw new Error(`Square write must use validated RPC: ${rpc}`);
if(html.includes('id="commentModal"'))throw new Error('Comments must expand inline instead of opening the old modal');
if(app.includes('data-publish="project:')||app.includes('data-publish="work:'))throw new Error('Retired project/work sharing remains wired');

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
