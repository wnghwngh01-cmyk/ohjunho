import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const expectedPages=['today','calendar','more','diary','personal','records','books','lab','goals','square','notifications','search','bug','support','settings'];

for(const page of expectedPages){
  if(!html.includes(`data-page="${page}"`))throw new Error(`Missing page section: ${page}`);
  if(!app.includes(`${page}:[`))throw new Error(`Missing page title: ${page}`);
}

const bottom=html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0]||'';
const bottomOrder=[...bottom.matchAll(/data-go="([^"]+)"/g)].map(x=>x[1]);
const wantedBottom=['today','calendar','more','personal','square'];
if(JSON.stringify(bottomOrder)!==JSON.stringify(wantedBottom))throw new Error(`Unexpected bottom navigation: ${bottomOrder.join(',')}`);

const more=html.match(/<section id="page-more"[\s\S]*?<\/section>/)?.[0]||'';
for(const page of expectedPages.filter(x=>!['more','notifications'].includes(x)))if(!more.includes(`data-go="${page}"`))throw new Error(`More menu is missing: ${page}`);
if(more.includes('data-go="notifications"'))throw new Error('Notifications must live in the top bar, not More');
if(!html.match(/<header class="topbar">[\s\S]*?data-go="notifications"[\s\S]*?<\/header>/))throw new Error('Top bar notification button is missing');

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
