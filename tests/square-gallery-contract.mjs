import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const views=fs.readFileSync(new URL('../js/stitch-views.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/styles.css',import.meta.url),'utf8');
const lightCss=fs.readFileSync(new URL('../assets/light-theme.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step11_square_following_filter.sql',import.meta.url),'utf8');

for(const token of ['public_media','slice(0,6)','data-lightbox-gallery','publicationMediaPaths','Promise.allSettled(newPublicPaths.map']){
  if(!app.includes(token))throw new Error(`Missing multi-photo Square behavior: ${token}`);
}
if(!app.includes("source.record_media||[]"))throw new Error('Square sharing must read all source record media');
if(!html.includes('최대 6장까지 함께 공개'))throw new Error('Share dialog does not explain the six-photo limit');
for(const token of ['.pub-gallery','.like-button.on','color:#d64255','.like-icon','.comment-icon','.comment-arrow','.unpublish-button','font-weight:750']){
  if(!css.includes(token))throw new Error(`Missing Square visual rule: ${token}`);
}
for(const token of ['data-like="${esc(p.id)}" data-on="${liked}" aria-pressed="${liked}" aria-label=','data-comment-arrow','aria-expanded="false" aria-label="댓글','data-copy-link="${esc(c.profileUrl)}"','data-unpublish="${esc(p.source_type)}:${esc(p.source_id)}"','aria-label="게시물 더보기"','data-lightbox-gallery','+${more}']){
  if(!views.includes(token))throw new Error(`Missing accessible Square action design: ${token}`);
}
for(const token of ["meta.author=bookMeta(source,'저자')",'function publicationBookAuthor(pub)','bookAuthor:publicationBookAuthor(p)']){
  if(!app.includes(token))throw new Error(`Missing shared-book author behavior: ${token}`);
}
if(!views.includes('${esc(c.bookAuthor)} 지음'))throw new Error('Missing shared-book author line');
if(!lightCss.includes('.pub-actions :is(.share-button,.unpublish-button,.moderation-btn){font-weight:750}'))throw new Error('Square text actions must share a consistent visual weight');
if(!migration.includes('p.user_id<>auth.uid()'))throw new Error('Following feed must explicitly exclude the signed-in user');
if(!migration.includes('f.follower_id=auth.uid() and f.following_id=p.user_id'))throw new Error('Following feed must require a follow relationship');
if(!migration.includes('revoke all on function public.get_publication_feed_v2'))throw new Error('Feed RPC permissions must be explicit');

console.log('square-gallery-contract: PASS');
