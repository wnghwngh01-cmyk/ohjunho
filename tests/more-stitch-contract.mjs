import assert from 'node:assert/strict';
import fs from 'node:fs';

// Final Stitch More screen v7 (static export of Stitch "_4", 2026-11-20), imported with scripts/import-stitch-more-v7.mjs.
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/more-stitch.css',import.meta.url),'utf8');
const bottomNavCss=fs.readFileSync(new URL('../assets/bottom-nav.css',import.meta.url),'utf8');
const generated=fs.readFileSync(new URL('../assets/more-stitch.generated.css',import.meta.url),'utf8');
const config=fs.readFileSync(new URL('../scripts/tailwind.more-stitch.config.cjs',import.meta.url),'utf8');
const importer=fs.readFileSync(new URL('../scripts/import-stitch-more-v7.mjs',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const section=html.match(/<section id="page-more"[\s\S]*?<\/section>\s*\r?\n\s*<section id="page-shelter"/)?.[0]||'';
const bottom=html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0]||'';

assert.ok(section,'더보기 화면이 있어야 한다.');
assert.match(section,/<div class="stitch-more-canvas w-full max-w-\[420px\] mx-auto space-y-4">/,'Stitch #moreApp container classes are kept');
// Stitch header with its own bell; unread dot starts hidden and is driven by setNotificationBadge.
assert.match(section,/<h1 class="text-xl font-bold text-\[#1C1D1B\] tracking-tight">더보기<\/h1>/);
assert.match(section,/<button id="moreNotifications" type="button" data-go="notifications" aria-label="알림" class="w-10 h-10 rounded-full flex items-center justify-center text-\[#1C1D1B\] hover:bg-\[#F0EFEA\] transition-colors relative">/);
assert.match(section,/<span id="moreNotificationDot" class="absolute top-2\.5 right-2\.5 w-2 h-2 rounded-full bg-\[#B45650\] ring-2 ring-\[#FAF9F6\] hidden"><\/span>/);
assert.match(app,/\$\('#moreNotificationDot'\)\?\.classList\.toggle\('hidden',!show\)/);
// Profile card bound to real data.
for(const id of ['profile-card','user-avatar-initial','user-name','user-streak'])assert.match(section,new RegExp(`id="${id}"`));
assert.match(app,/MoreProfile\.view\(p,u\)/);
// Sections and the 18 Stitch rows, in order, each routed.
for(const label of ['생활 · DAILY LIFE','하루 쉼터 · PLAY','관리 · CONTROL (&amp;|&) SOCIAL','도움 · SUPPORT (&amp;|&) SYSTEM'])assert.match(section,new RegExp(label));
for(const title of ['오늘의 하루','캘린더','일기','가계부','운동 기록','기록','독서록','아이디어','1 to 25','검 강화하기','오늘 화면 설정','목표 설정','광장','통합 검색','버그 제보','운영자 1:1 문의','창작자 후원하기','앱 환경 설정'])assert.match(section,new RegExp(`tracking-tight">${title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}<`));
const routes=[...section.matchAll(/data-go="([^"]+)" role="button"/g)].map(match=>match[1]);
assert.deepEqual(routes,['settings','today','calendar','diary','personal','workout','records','books','lab','shelter','forge','today-settings','goals','square','search','bug','contact','support','settings']);
assert.equal((section.match(/p-3\.5 cursor-pointer tap-active transition-colors/g)||[]).length,18,'Stitch row markup (p-3.5) is used for every menu row');
// The user's chosen sword icon is kept for 검 강화하기.
assert.match(section,/id="icon-forge"[^>]*><path d="M14\.5 17\.5L3 6V3h3l11\.5 11\.5"><\/path>/);
assert.doesNotMatch(section,/M14\.5 4\.5L19\.5 9\.5L10 19L5 20L6 15L14\.5 4\.5Z/);
// Version footer kept by user decision (1.1.0 until release).
assert.match(section,/하루를 담다 · v<span id="appVersionLabel"><\/span>/);
assert.doesNotMatch(section,/NEW|김민서|기록 128일째|onclick=/,'no sample data or demo handlers');
// Theme and shell mirror the Stitch file.
assert.match(config,/important:'#page-more'/);
assert.match(config,/fontFamily:\{sans:\['Pretendard'/);
assert.match(config,/coral:'#B45650'/);
assert.match(generated,/space-y-4/);
assert.match(generated,/p-3\\\.5/);
assert.match(css,/background:#FAF9F6;color:#1C1D1B;/);
assert.match(css,/#page-more \.tap-active:active\{transform:scale\(\.98\);background-color:#F5F4F0\}/);
assert.match(css,/body:has\(#page-more\.active\) \.topbar\{display:none!important\}/,'global top bar is hidden because the screen has its own header');
assert.doesNotMatch(css,/bottom-nav/);
assert.match(importer,/userForge/);
// Shared bottom navigation unchanged.
assert.deepEqual([...bottom.matchAll(/data-go="([^"]+)"/g)].map(match=>match[1]),['today','calendar','personal','square','more']);
assert.equal((bottom.match(/<svg\b[^>]*width="20"[^>]*height="20"/g)||[]).length,5);
assert.match(bottomNavCss,/color:#1e3a2f;font-weight:600/);
// Bottom-nav icons use the same drawings as the Stitch More rows for the same destination (only the size attributes differ).
const iconBody=svg=>svg.replace(/^<svg\b[^>]*>/,'').replace(/<\/svg>$/,'');
for(const go of ['today','calendar','personal','square']){
  const navSvg=bottom.match(new RegExp(`data-go="${go}"><svg\\b[\\s\\S]*?<\\/svg>`))?.[0].replace(/^data-go="[^"]+">/,'')||'';
  const rowSvg=section.match(new RegExp(`data-go="${go}" role="button"[\\s\\S]*?(<svg\\b[\\s\\S]*?<\\/svg>)`))?.[1]||'';
  assert.ok(navSvg&&rowSvg,`icon for ${go} exists in both places`);
  assert.equal(iconBody(navSvg),iconBody(rowSvg),`bottom-nav ${go} icon matches the Stitch More row icon`);
}
// 버그 제보 icon: the previous More page's bug (diagonal legs ending at the body edge, two short antennae).
const bugSvg=section.match(/data-go="bug" role="button"[\s\S]*?(<svg\b[\s\S]*?<\/svg>)/)?.[1]||'';
assert.equal(iconBody(bugSvg),'<rect width="8" height="14" x="8" y="6" rx="4"></rect><path d="m19 7-3 2"></path><path d="m5 7 3 2"></path><path d="m19 19-3-2"></path><path d="m5 19 3-2"></path><path d="M20 13h-4"></path><path d="M4 13h4"></path><path d="m10 4 1 2"></path><path d="m14 4-1 2"></path>');
assert.doesNotMatch(section,/<path d="M6 10h4"><\/path><path d="M14 10h4"><\/path>/,'Stitch bug legs that crossed the body are gone');
assert.match(importer,/bug icon \(previous More page\)/);
assert.match(app,/\[data-go\]\[role="button"\]/);
// Cache busting.
assert.match(html,/more-stitch\.generated\.css\?v=20261120-more-v8/);
assert.match(html,/more-stitch\.css\?v=20261120-more-v7/);
assert.match(sw,/more-stitch\.generated\.css\?v=20261120-more-v8/);
assert.match(sw,/more-stitch\.css\?v=20261120-more-v7/);

console.log('More Stitch v7 contract PASS');
