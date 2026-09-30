import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const lightTheme=fs.readFileSync(new URL('../assets/light-theme.css',import.meta.url),'utf8');
const page=html.match(/<section id="page-today"[\s\S]*?<section id="memoryCard"/)?.[0]||'';
const greeting=page.match(/<section class="greeting">[\s\S]*?<\/section>/)?.[0]||'';

if(greeting.includes('id="dailyQuote"')||page.includes('오늘의 문장'))throw new Error('Daily quote must be removed from Today');
if(!greeting.includes('오늘의 일정과 할 일을 챙기고, 하루의 기록을 차곡차곡 담아보세요.'))throw new Error('Today app introduction is missing');
if(!greeting.includes('id="todayCountdowns"'))throw new Error('Important-day countdown must be inside the Today hero');
if(app.includes('const quotes=')||app.includes("$('#dailyQuote')"))throw new Error('Daily quote rotation code must be removed');
if(app.includes('countdowns.slice(0,1)'))throw new Error('Today hero must not limit important days to one');
if(!app.includes('countdowns.map(')||!app.includes('hero-countdown-item'))throw new Error('Today hero must render every upcoming important day');
if(!app.includes('DB.listImportantEvents(day)'))throw new Error('Today must load upcoming important days without an end-date cap');
const importantQuery=db.match(/async function listImportantEvents[\s\S]*?return data\|\|\[\]\}/)?.[0]||'';
if(!importantQuery||importantQuery.includes('.limit('))throw new Error('Upcoming important days must not have a fixed row limit');
if(lightTheme.includes('.hero-focus-line span{'))throw new Error('Focus label styles must not override D-Day badge contrast');
const countdownBadge=lightTheme.match(/\.hero-countdown-badge\{[^}]+\}/)?.[0]||'';
if(!countdownBadge.includes('color:#204936')||!countdownBadge.includes('background:#f2f7f3')||!countdownBadge.includes('font-weight:800'))throw new Error('D-Day badge must keep a high-contrast treatment');
if(!app.includes('class="mini-item event-item"')||!lightTheme.includes('.today-grid .todo-item>[data-todo-move]'))throw new Error('Mobile Today rows must preserve readable content width');

const ordered=['오늘 일정','할 일 체크리스트','습관 체크리스트','빠른 기록'];
let previous=-1;
for(const label of ordered){
  const position=page.indexOf(`<h3>${label}</h3>`);
  if(position<0||position<previous)throw new Error(`Unexpected Today card order at: ${label}`);
  previous=position;
}
for(const removed of ['<h3>오늘의 문장</h3>','<h3>중요한 날짜</h3>','<h3>오늘 할 일</h3>','<h3>반복 습관</h3>']){
  if(page.includes(removed))throw new Error(`Removed Today card or label remains: ${removed}`);
}

console.log('today page contract: PASS');
