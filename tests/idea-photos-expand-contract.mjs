import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../index.html');
const app=read('../js/app.js');
const db=read('../js/db.js');
const storage=read('../js/storage.js');
const css=read('../assets/styles.css');
const migration=read('../supabase/step10_idea_photos.sql');
const sw=read('../sw.js');

for(const token of ['id="ideaImages"','id="ideaPhotoPreview"','accept="image/jpeg,image/png,image/webp"']){
  if(!html.includes(token))throw new Error(`Idea photo UI is missing: ${token}`);
}
for(const token of ["select('*,idea_media(*)')",'addIdeaMedia','removeIdeaMedia']){
  if(!db.includes(token))throw new Error(`Idea photo database path is missing: ${token}`);
}
for(const token of ['uploadIdeaImages','singleFlight(`idea:${ideaId}`','removePrivatePaths([...removable])']){
  if(!storage.includes(token))throw new Error(`Idea photo upload recovery is missing: ${token}`);
}
for(const token of ['previewIdeaFiles','prepareIdeaUrls','data-remove-new-idea-photo','Storage.uploadIdeaImages','async function deleteIdea','idea.idea_media']){
  if(!app.includes(token))throw new Error(`Idea photo app flow is missing: ${token}`);
}
for(const token of ['collapsibleCopy(r.body)','collapsibleCopy(i.body','collapsibleCopy(p.body)','collapsibleCopy(r.body,\'감상 없음\')','data-toggle-copy','activateCollapsibleText']){
  if(!app.includes(token))throw new Error(`Four-line expansion flow is missing: ${token}`);
}
if(!css.includes('-webkit-line-clamp:4')||!css.includes('.text-expand')||!css.includes('.lab-search{margin-bottom:24px}'))throw new Error('Collapse or idea spacing styles are incomplete');
for(const token of ['create table if not exists public.idea_media','enable row level security','user_id=auth.uid()','references public.ideas(id,user_id) on delete cascade']){
  if(!migration.includes(token))throw new Error(`Idea media ownership migration is missing: ${token}`);
}
if(!sw.includes("daily-life-shell-v64")||!sw.includes('20261004-square-intro-remove-v1')||!sw.includes('20261004-profile-photos-v1'))throw new Error('Service worker cache does not include the latest accumulated assets');

console.log('idea-photos-expand-contract: PASS');
