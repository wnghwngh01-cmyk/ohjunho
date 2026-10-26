import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const todayTheme=fs.readFileSync(new URL('../assets/today-stitch.css',import.meta.url),'utf8');
const page=html.match(/<section id="page-today"[\s\S]*?<section id="page-records"/)?.[0]||'';
const greeting=page.match(/<section class="stitch-intro">[\s\S]*?<\/section>/)?.[0]||'';

if(greeting.includes('id="dailyQuote"')||page.includes('오늘의 문장'))throw new Error('Daily quote must be removed from Today');
if(greeting.includes('일정과 할 일, 습관과 기록을 한곳에서 챙기며 오늘을 차분히 이어가세요.'))throw new Error('Duplicate Today introduction must be removed');
if(!greeting.includes('id="todayGoalCard"')||!greeting.includes('id="todayCountdowns"'))throw new Error('Goals and D-Day must share the Stitch goal card');
if(!greeting.includes('class="stitch-goal-row"')||!greeting.includes('data-go="goals"'))throw new Error('Goal rows must navigate to goal management');
if(!greeting.includes('id="todayDdayAction"'))throw new Error('D-Day row is missing');
if(page.includes('id="memoryCard"')||page.includes('1년 전 오늘'))throw new Error('One-year-ago memory must not appear on Today');
if(app.includes('const quotes=')||app.includes("$('#dailyQuote')"))throw new Error('Daily quote rotation code must be removed');
if(!app.includes('const nearest=countdowns[0]')||!app.includes('countdowns.length-1'))throw new Error('D-Day must show the nearest item and remaining count');
if(!app.includes('중요한 날짜가 없습니다')||app.includes('캘린더에서 설정하기 →'))throw new Error('D-Day empty state must be informational only');
if(!app.includes('data-today-countdown-day')||!app.includes('state.calendarView=new Date(target.getFullYear(),target.getMonth(),1)'))throw new Error('D-Day must open its exact calendar date');
if(!app.includes('DB.listImportantEvents(day)'))throw new Error('Today must load upcoming important days without an end-date cap');
const importantQuery=db.match(/async function listImportantEvents[\s\S]*?return data\|\|\[\]\}/)?.[0]||'';
if(!importantQuery||importantQuery.includes('.limit('))throw new Error('Upcoming important days must not have a fixed row limit');
if(!todayTheme.includes('--st-bg:#fbf9f5')||!todayTheme.includes('--st-primary:#1e3a2f'))throw new Error('Stitch color tokens must remain intact');
if(!app.includes('class="stitch-row event-item ')||!app.includes('class="stitch-move"'))throw new Error('Mobile Today rows must use the Stitch list geometry');
if(app.includes('class="todo-delete"'))throw new Error('Today must not expose a delete X beside todos');
if(!html.includes('today-stitch.css?v=20261026-stitch-variant-a-v3'))throw new Error('Today Variant A stylesheet is not loaded');
if(!todayTheme.includes("url('./material-symbols-outlined.ttf')"))throw new Error('Stitch icon font must be self-hosted');
if(!todayTheme.includes('grid-template-columns:66px minmax(0,1fr) 16px')||!todayTheme.includes('gap:18px'))throw new Error('Stitch A alignment and vertical rhythm must remain exact');
if(!todayTheme.includes('overflow-wrap:anywhere')||todayTheme.includes('.stitch-goal-value{')&&!todayTheme.includes('word-break:keep-all'))throw new Error('Long goals must wrap without a fixed-height clamp');
if(!app.includes('stitch-habit-dots')||!app.includes('`주 ${progress.completed}/${progress.target}일`'))throw new Error('Weekly habit progress dots are missing');
for(const hook of ['topbarTitle','topbarSub','syncState','page-today','todayDate','greetingTitle','todayGoalCard','todayFinalGoal','todayMonthlyGoal','todayDdayAction','todayCountdowns','todayEvents','todayTodoCount','todayTodoInput','todayTodoAdd','todayTodos','todayHabits','quickRecordText','quickRecordSave'])if(!html.includes(`id="${hook}"`))throw new Error(`Today hook is missing: ${hook}`);

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
