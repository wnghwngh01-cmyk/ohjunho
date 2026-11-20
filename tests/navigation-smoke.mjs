import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const expectedPages=['today','today-settings','calendar','more','diary','personal','workout','shelter','forge','records','books','lab','goals','square','notifications','search','bug','support','settings'];

for(const page of expectedPages){
  if(!html.includes(`data-page="${page}"`))throw new Error(`Missing page section: ${page}`);
  if(!app.includes(`${page}:[`)&&!app.includes(`'${page}':[`))throw new Error(`Missing page title: ${page}`);
}

const bottom=html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0]||'';
const bottomOrder=[...bottom.matchAll(/data-go="([^"]+)"/g)].map(x=>x[1]);
const wantedBottom=['today','calendar','personal','square','more'];
if(JSON.stringify(bottomOrder)!==JSON.stringify(wantedBottom))throw new Error(`Unexpected bottom navigation: ${bottomOrder.join(',')}`);

const more=html.match(/<section id="page-more"[\s\S]*?<section id="page-shelter"/)?.[0]||'';
for(const page of expectedPages.filter(x=>!['more','notifications'].includes(x)))if(!more.includes(`data-go="${page}"`))throw new Error(`More menu is missing: ${page}`);
// User decision 2026-11-20: no page title bar and no bell at the top of pages; the bell lives only in the Today header.
if(/data-go="notifications"/.test(more))throw new Error('More must not show a notification bell');
if(/<h1[^>]*>더보기<\/h1>/.test(more))throw new Error('More must not show a page title');
const today=html.match(/<section id="page-today"[\s\S]*?<section id="page-records"/)?.[0]||'';
if(!/<button[^>]*id="todayNotifications"[^>]*data-go="notifications"/.test(today))throw new Error('Today header bell is missing');
const visibleBells=[...html.matchAll(/<[^>]*data-go="notifications"[^>]*>/g)].map(x=>x[0]).filter(tag=>!tag.includes('id="topbarNotifications"'));
if(visibleBells.length!==1||!visibleBells[0].includes('id="todayNotifications"'))throw new Error('Only the Today page may have a notification bell');
const bottomNavCss=fs.readFileSync(new URL('../assets/bottom-nav.css',import.meta.url),'utf8');
if(!bottomNavCss.includes('.app-shell .topbar{display:none!important}'))throw new Error('The shared top bar (title + bell) must be hidden on every page');

const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
if(duplicates.length)throw new Error(`Duplicate ids: ${[...new Set(duplicates)].join(',')}`);

for(const id of ['financePrevMonth','financeNextMonth','financeThisMonth','financeMonthLabel','financeCategorySummary']){
  if(!html.includes(`id="${id}"`))throw new Error(`Finance summary control is missing: ${id}`);
}
for(const behavior of ['moveFinanceMonth(-1)','moveFinanceMonth(1)','renderFinance()']){
  if(!app.includes(behavior))throw new Error(`Finance month behavior is missing: ${behavior}`);
}
for(const behavior of ['data-move-event','shiftDay(','moveEventNext(']){
  if(!app.includes(behavior))throw new Error(`Event rollover behavior is missing: ${behavior}`);
}

for(const removedId of ['recordCategory','recordMood','recordTitle']){
  if(html.includes(`id="${removedId}"`)||app.includes(`$('#${removedId}')`))throw new Error(`Removed record field remains wired: ${removedId}`);
}
for(const requiredId of ['diaryImages','diaryDraftState','eventImportant','todayCountdowns','finalGoalReason','monthlyGoalAction']){
  if(!html.includes(`id="${requiredId}"`))throw new Error(`Daily-life control is missing: ${requiredId}`);
}
for(const behavior of ['listImportantEvents','scheduleDiaryDraft','uploadRecordImages','moodClass(','loadGoalsPage']){
  if(!app.includes(behavior))throw new Error(`Daily-life behavior is missing: ${behavior}`);
}

console.log('navigation-smoke: PASS');
