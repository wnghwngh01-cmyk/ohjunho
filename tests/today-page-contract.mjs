import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const todayTheme=fs.readFileSync(new URL('../assets/today-stitch.css',import.meta.url),'utf8');
const page=html.match(/<section id="page-today"[\s\S]*?<section id="page-records"/)?.[0]||'';
const greeting=page.match(/<section class="stitch-intro">[\s\S]*?<\/section>/)?.[0]||'';

if(greeting.includes('id="dailyQuote"')||page.includes('오늘의 문장'))throw new Error('Daily quote must be removed from Today');
if(greeting.includes('일정과 할 일, 습관과 기록을 한곳에서 챙기며 오늘을 차분히 이어가세요.'))throw new Error('Duplicate Today introduction must be removed');
if(!greeting.includes('id="todayCountdowns"'))throw new Error('Important-day countdown must be inside the Today hero');
if(app.includes('const quotes=')||app.includes("$('#dailyQuote')"))throw new Error('Daily quote rotation code must be removed');
if(app.includes('countdowns.slice(0,1)'))throw new Error('Today hero must not limit important days to one');
if(!app.includes('countdowns.map(')||!app.includes('stitch-countdown'))throw new Error('Today hero must render every upcoming important day');
if(!app.includes('DB.listImportantEvents(day)'))throw new Error('Today must load upcoming important days without an end-date cap');
const importantQuery=db.match(/async function listImportantEvents[\s\S]*?return data\|\|\[\]\}/)?.[0]||'';
if(!importantQuery||importantQuery.includes('.limit('))throw new Error('Upcoming important days must not have a fixed row limit');
if(!todayTheme.includes('--st-bg:#fbf9f5')||!todayTheme.includes('--st-primary:#1e3a2f'))throw new Error('Stitch color tokens must remain intact');
if(!app.includes('class="stitch-row event-item ')||!app.includes('class="stitch-move"'))throw new Error('Mobile Today rows must use the Stitch list geometry');
if(app.includes('class="todo-delete"'))throw new Error('Today must not expose a delete X beside todos');
if(!html.includes('today-stitch.css?v=20261026-stitch-export-v2'))throw new Error('Today redesign stylesheet is not loaded');
if(!todayTheme.includes("url('./material-symbols-outlined.ttf')"))throw new Error('Stitch icon font must be self-hosted');
for(const hook of ['topbarTitle','topbarSub','syncState','page-today','todayDate','greetingTitle','todayFinalGoal','todayMonthlyGoal','todayCountdowns','todayEvents','todayTodoCount','todayTodoInput','todayTodoAdd','todayTodos','todayHabits','quickRecordText','quickRecordSave','memoryCard','memoryTitle','memoryBody','memoryOpen'])if(!html.includes(`id="${hook}"`))throw new Error(`Today hook is missing: ${hook}`);

const ordered=['오늘 일정','할 일','습관','빠른 기록'];
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
