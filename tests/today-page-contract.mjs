import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const page=html.match(/<section id="page-today"[\s\S]*?<section id="memoryCard"/)?.[0]||'';
const greeting=page.match(/<section class="greeting">[\s\S]*?<\/section>/)?.[0]||'';

if(!greeting.includes('id="dailyQuote"'))throw new Error('Daily quote must be inside the Today hero');
if(!greeting.includes('id="todayCountdowns"'))throw new Error('Important-day countdown must be inside the Today hero');
if(!app.includes('quotes[seed%quotes.length]'))throw new Error('Daily quote rotation is missing');
if(!app.includes('countdowns.slice(0,1)'))throw new Error('Today hero must show only the nearest important day');

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
