import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/styles.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step11_square_following_filter.sql',import.meta.url),'utf8');

for(const token of ['public_media','slice(0,6)','data-lightbox-gallery','publicationMediaPaths','Promise.allSettled(newPublicPaths.map']){
  if(!app.includes(token))throw new Error(`Missing multi-photo Square behavior: ${token}`);
}
if(!app.includes("source.record_media||[]"))throw new Error('Square sharing must read all source record media');
if(!html.includes('최대 6장까지 함께 공개'))throw new Error('Share dialog does not explain the six-photo limit');
for(const token of ['.pub-gallery','.like-button.on','color:#d64255','.comment-icon','.comment-arrow']){
  if(!css.includes(token))throw new Error(`Missing Square visual rule: ${token}`);
}
for(const token of ['♥','class="comment-icon"','class="comment-arrow"','class="share-button"']){
  if(!app.includes(token))throw new Error(`Missing accessible Square action design: ${token}`);
}
for(const token of ["meta.author=bookMeta(source,'저자')",'function publicationBookAuthor(pub)', 'pub-book-author']){
  if(!app.includes(token))throw new Error(`Missing shared-book author behavior: ${token}`);
}
if(!css.includes('.pub-book-author'))throw new Error('Missing shared-book author styling');
if(!migration.includes('p.user_id<>auth.uid()'))throw new Error('Following feed must explicitly exclude the signed-in user');
if(!migration.includes('f.follower_id=auth.uid() and f.following_id=p.user_id'))throw new Error('Following feed must require a follow relationship');
if(!migration.includes('revoke all on function public.get_publication_feed_v2'))throw new Error('Feed RPC permissions must be explicit');

console.log('square-gallery-contract: PASS');
