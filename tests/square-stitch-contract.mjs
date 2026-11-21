import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 광장 Stitch screens ("광장 (발견)", "광장 (앱 개선)", "광장 - 상태 모음", 2026-11-20), implemented 2026-11-21.
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const html=read('index.html'),app=read('js/app.js'),viewsSrc=read('js/stitch-views.js'),sw=read('sw.js'),pkg=read('package.json');
const shell=read('assets/square-stitch.css'),input=read('assets/square-stitch-input.css'),generated=read('assets/square-stitch.generated.css'),config=read('scripts/tailwind.square-stitch.config.cjs');

const start=html.indexOf('<section id="page-square"'),end=html.indexOf('<section id="page-',start+10),page=html.slice(start,end);
assert.ok(start>0&&end>start,'광장 section exists');
// No page title/description/bell (user decision: the bell lives only on Today).
assert.doesNotMatch(page,/page-head|<h1|eyebrow|notification/i);
assert.doesNotMatch(page,/\sstyle="/,'CSP blocks inline style attributes');
for(const id of ['squareTabs','squareDiscover','communityComposer','communityPostBody','communityPostCount','communityPostSubmit','squareCategories','squareFeed','squareFeedback','featureComposer','featureTitle','featureTitleCount','featureBody','featureBodyCount','featureSubmit','featureList'])assert.match(page,new RegExp(`id="${id}"`),id);
assert.match(page,/id="communityPostBody" maxlength="6000"[^>]*data-count-target="communityPostCount"/);
assert.match(page,/id="featureTitle" maxlength="120"[^>]*data-count-target="featureTitleCount"/);
assert.match(page,/id="featureBody" maxlength="3000"[^>]*data-count-target="featureBodyCount"/);
for(const cat of ['all','record','diary','book','community','forge'])assert.match(page,new RegExp(`data-square-category="${cat}"`));
assert.match(page,/더보기 &gt; 버그 제보/);

// Assets: shell + generated CSS linked, cached by the service worker, built with the other Stitch pages.
for(const file of ['assets/square-stitch.css','assets/square-stitch.generated.css','js/stitch-views.js','js/app.js']){
  const url=html.match(new RegExp(`(?:href|src)="(\\./${file.replace(/[.]/g,'\\.')}\\?v=[^"]+)"`))?.[1];
  assert.ok(url,`${file} is linked`);assert.ok(sw.includes(`'${url}'`),`${file} is in the SW shell`);
}
assert.match(pkg,/"build:square-css": "tailwindcss -c scripts\/tailwind\.square-stitch\.config\.cjs -i assets\/square-stitch-input\.css -o assets\/square-stitch\.generated\.css --minify"/);
assert.match(pkg,/"build:stitch-css": "[^"]*pnpm run build:square-css[^"]*"/);
assert.match(config,/important:'#page-square'/);assert.match(config,/preflight:false/);assert.match(config,/subtle:'0 2px 8px rgba\(0, 0, 0, 0\.025\)'/);
assert.match(input,/:where\(#page-square\) \*/,'resets stay at zero specificity so forge/avatar/title styles survive');
assert.doesNotMatch(input,/(^|[^(])#page-square[ ,{]/m,'no id-specific base resets');
for(const cls of ['shadow-subtle','line-clamp-4','bg-black\\/40','group-open\\:rotate-180','rotate-180','border-l-2'])assert.ok(generated.includes(cls),`generated CSS has ${cls}`);
assert.match(shell,/#page-square \.avatar\.square-avatar\{width:40px;height:40px/);
assert.match(shell,/#page-square \.avatar\.square-comment-avatar\{width:20px;height:20px/);

// App wiring.
for(const token of ['syncSquareCategories()','function syncCounter(el)',"$$('#page-square [data-count-target]')",'function startReply(pubId,commentId,name)','function clearReply(pubId)','[data-reply-cancel]','[data-square-more]',"confirm('이 댓글을 삭제할까요?')",'Forge.publicationCard(p)','Views.squareEmpty(\'광장을 준비하고 있습니다.\',true)','Views.squareFeature(f,fmtShortDate(f.created_at))','Views.SQ_TAB_ON','setCommentToggle(pubId,opening)'])assert.ok(app.includes(token),token);
// The ··· menu closes on outside click, after choosing an item and on Escape, and reports aria-expanded (2026-11-21 web QA).
assert.ok(app.includes("document.querySelectorAll('.action-menu[open],[data-square-menu][open]')"),'outside click closes the square menu');
assert.ok(app.includes("e.target.matches?.('.action-menu,[data-square-menu]')"),'square menu toggles aria-expanded');
assert.ok(app.includes("document.querySelector('.action-menu[open],[data-square-menu][open]')"),'Escape closes the square menu');
assert.match(app,/님에게 답글 남기는 중/);assert.match(app,/님에게 답글 남기기/);

// Render the templates with sample rows.
const ctx={window:{}};vm.runInNewContext(viewsSrc,ctx);const V=ctx.window.HaruStitchViews;
const base={id:'p1',user_id:'u2',source_type:'diary',source_id:'s1',title:'제목',body:'본문 <b>',display_name:'이지우',lab_name:'지우의 연구실',like_count:3,comment_count:2,liked_by_me:false,following_author:false};
const c={own:false,avatar:'<div class="avatar square-avatar"></div>',title:'<span class="title-badge">새벽</span>',media:[],bookAuthor:'',profileUrl:'./public.html?slug=a',time:'11. 21. 오후 03:00',forgeHtml:'',forgeLabel:'',likeLabel:'좋아요'};
const plain=V.squareCard(base,c);
assert.doesNotMatch(plain,/\sstyle="/);assert.match(plain,/본문 &lt;b&gt;/,'body is escaped');
assert.match(plain,/bg-\[#EBF7F0\] text-\[#1E3A2F\][^"]*">일기</);assert.match(plain,/>팔로우</);assert.match(plain,/data-report-type="publication"/);assert.match(plain,/data-block-user="u2"/);
assert.doesNotMatch(plain,/data-unpublish|내 글/);
assert.match(plain,/data-comment-panel="p1" class="hidden /);assert.match(plain,/data-reply-line class="hidden /);
const own=V.squareCard({...base,user_id:'u1',liked_by_me:true,following_author:false},{...c,own:true});
assert.match(own,/내 글/);assert.match(own,/data-unpublish="diary:s1"/);assert.doesNotMatch(own,/data-follow|data-block-user/);
assert.match(own,/text-\[#B45650\]/,'liked heart is coral');assert.match(own,/fill-current/);
const following=V.squareCard({...base,following_author:true},c);assert.match(following,/bg-\[#1E3A2F\] text-white[^"]*">팔로잉</);
const photos=n=>Array.from({length:n},(_,i)=>({url:`https://x/${i}.jpg`,name:`p${i}`}));
assert.match(V.squareGallery(photos(1)),/aspect-\[4\/3\]/);
assert.match(V.squareGallery(photos(2)),/grid grid-cols-2/);
assert.match(V.squareGallery(photos(3)),/grid grid-cols-3/);
const six=V.squareGallery(photos(6));
assert.match(six,/\+2<\/span>/);assert.equal((six.match(/data-lightbox="/g)||[]).length,6,'all photos stay in the lightbox gallery');assert.equal((six.match(/class="hidden"/g)||[]).length,2);
assert.equal(V.squareGallery(photos(4)).includes('+'),false,'no +N for exactly four');
const book=V.squareCard({...base,source_type:'book'},{...c,bookAuthor:'한강'});assert.match(book,/한강 지음/);assert.match(book,/bg-\[#FEF6EC\] text-\[#C97A1E\][^"]*">독서록</);
const free=V.squareCard({...base,source_type:'community'},c);assert.doesNotMatch(free,/<h2/,'자유글 has no title');
const forge=V.squareCard({...base,source_type:'forge'},{...c,forgeHtml:'<div class="forge-certificate">cert</div>',forgeLabel:'🌼 헌화하기',likeLabel:'축하해요'});
assert.match(forge,/data-forge-slot><div class="forge-certificate">cert<\/div>/);assert.match(forge,/<span>🌼 헌화하기<\/span>/);assert.doesNotMatch(forge,/data-square-text/);
const comment=V.squareComment({id:'c1',user_id:'u3',display_name:'민서',body:'좋아요',parent_display_name:'지우'},{avatar:'',title:'',mine:false,time:'t'},'p1',true,false);
assert.match(comment,/pl-6 space-y-1 border-l-2 border-\[#E9E8E5\]/);assert.match(comment,/<strong class="font-bold text-\[#1E3A2F\]">@지우<\/strong>/);assert.match(comment,/data-report-type="comment"/);
assert.match(V.squareComment({id:'c2',user_id:'u1',display_name:'나',body:'x'},{avatar:'',title:'',mine:true,time:'t'},'p1',false,true),/data-delete-comment="c2"/);
assert.match(V.squareCommentsEmpty(),/첫 댓글을 남겨보세요\./);
const voted=V.squareFeature({id:'f1',title:'제안',body:'',status:'done',vote_count:84,voted_by_me:true,display_name:'이지우'},'11. 08.');
assert.match(voted,/data-on="true"[^>]*bg-\[#1E3A2F\] text-white/);assert.match(voted,/반영 완료/);assert.match(voted,/이지우 · 11\. 08\./);assert.doesNotMatch(voted,/<p /,'empty body is omitted');
for(const [status,label] of [['proposed','제안됨'],['planned','검토 후 계획'],['working','개발 중'],['declined','보류']])assert.match(V.squareFeature({id:'f',title:'t',status,vote_count:0},'d'),new RegExp(label));
assert.match(V.squareEmpty('광장을 준비하고 있습니다.',true),/py-10 text-center"><p class="text-sm font-semibold text-\[#424844\]">/);

console.log('square stitch contract: PASS');
