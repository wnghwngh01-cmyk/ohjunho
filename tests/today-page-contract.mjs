import fs from 'node:fs';

// Today page contract for the final Stitch "1_1" screen (2026-11-20 re-implementation).
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const views=fs.readFileSync(new URL('../js/stitch-views.js',import.meta.url),'utf8');
const todayShell=fs.readFileSync(new URL('../assets/today-stitch.css',import.meta.url),'utf8');
const generated=fs.readFileSync(new URL('../assets/today-stitch.generated.css',import.meta.url),'utf8');
const page=html.match(/<section id="page-today"[\s\S]*?<section id="page-records"/)?.[0]||'';
const fail=message=>{throw new Error(message)};

if(!page)fail('Today section is missing');
if(/style\s*=/.test(page))fail('Today markup must not contain inline style attributes (CSP style-src self)');
if(!page.includes('data-today-section="quote"')||!page.includes('id="todayQuote"'))fail('Configurable daily quote block is missing from Today');
if(!page.includes('id="todayGoalCard"')||!page.includes('id="todayCountdowns"')||!page.includes('id="todayDdayAction"'))fail('Goals and D-Day must share the Stitch goal card');
if(!page.includes('data-go="goals"'))fail('Goal rows must navigate to goal management');
if(!page.includes('id="todayNotifications"')||!page.includes('data-go="notifications"')||!page.includes('id="todayNotificationDot"'))fail('Today header bell must open notifications and carry the unread dot');
if(page.includes('id="memoryCard"')||page.includes('1년 전 오늘'))fail('One-year-ago memory must not appear on Today');
if(db.includes('memory:memory.data')||db.includes("x.setFullYear(x.getFullYear()-1)"))fail('Removed memory card must not trigger a dashboard query');
if(!app.includes('const quotes=')||!app.includes("$('#todayQuote')"))fail('Daily quote rotation code is missing');
if(!app.includes('const nearest=countdowns[0]')||!app.includes('countdowns.length-1'))fail('D-Day must show the nearest item and remaining count');
if(!app.includes('중요한 날짜가 없습니다')||app.includes('캘린더에서 설정하기 →'))fail('D-Day empty state must be informational only');
if(!app.includes('data-today-countdown-day')&&!app.includes('dataset.todayCountdownDay'))fail('D-Day must open its exact calendar date');
if(!app.includes('state.calendarView=new Date(target.getFullYear(),target.getMonth(),1)'))fail('D-Day must open its exact calendar month');
if(!app.includes('DB.listImportantEvents(day)'))fail('Today must load upcoming important days without an end-date cap');
const importantQuery=db.match(/async function listImportantEvents[\s\S]*?return data\|\|\[\]\}/)?.[0]||'';
if(!importantQuery||importantQuery.includes('.limit('))fail('Upcoming important days must not have a fixed row limit');

// Stitch rows come from js/stitch-views.js.
if(!app.includes('Views.todayEventRow')||!app.includes('Views.todayTodoRow')||!app.includes('Views.todayHabitRow'))fail('Today lists must use the Stitch row templates');
const eventRow=views.match(/function todayEventRow[\s\S]*?\n  \}/)?.[0]||'';
if(!eventRow.includes('data-event-toggle')||eventRow.includes('data-move-event')||eventRow.includes('내일로'))fail('Today events keep their checkbox and have no move-to-tomorrow action');
const todoRow=views.match(/function todayTodoRow[\s\S]*?\n  \}/)?.[0]||'';
if(!todoRow.includes('data-todo-move')||!todoRow.includes('data-todo-delete'))fail('Todo rows must offer 내일로 and 삭제');

// Shell and generated Tailwind build.
if(!todayShell.includes('max-width:480px')||!todayShell.includes('background:#FAF9F6'))fail('Today shell must keep the Stitch canvas');
if(!todayShell.includes('body:has(#page-today.active) .topbar{display:none!important}'))fail('Today must hide the global topbar (the screen has its own header)');
if(!generated.includes('#page-today'))fail('Generated Today Tailwind CSS must be scoped to #page-today');
// Preflight is disabled, so each Stitch page restores the border defaults itself; otherwise every `border` class draws nothing.
for(const name of ['today','calendar','more']){
  const css=fs.readFileSync(new URL(`../assets/${name}-stitch.generated.css`,import.meta.url),'utf8');
  if(!new RegExp(`#page-${name} \\*,[^{]*\\{[^}]*(border-style:solid|border:0 solid)`).test(css))fail(`${name} Stitch CSS must restore border-style:solid inside #page-${name}`);
}
for(const link of ['today-stitch.css?v=20261120-stitch-v1','today-stitch.generated.css?v=20261120-stitch-v2','stitch-views.js?v=20261120-stitch-v1'])if(!html.includes(link))fail(`Today asset is not loaded: ${link}`);
if(html.indexOf('stitch-views.js')>html.indexOf('js/app.js'))fail('stitch-views.js must load before app.js');

for(const hook of ['page-today','todayDate','greetingTitle','todayGoalCard','todayFinalGoal','todayMonthlyGoal','todayDdayAction','todayCountdowns','todayEvents','todayTodoCount','todayTodoInput','todayTodoAdd','todayTodos','todayHabits','todayHabitSettings','quickRecordText','quickRecordSave'])if(!html.includes(`id="${hook}"`))fail(`Today hook is missing: ${hook}`);

const defaultIds=['quote','events','todos','habits','protein','budget','records'];
let previous=-1;
for(const id of defaultIds){const position=page.indexOf(`data-today-section="${id}"`);if(position<0||position<previous)fail(`Unexpected default Today card order at: ${id}`);previous=position}
if(!app.includes('applyTodayLayout()')||!app.includes('section.hidden=!item.enabled')||!app.includes('stack.insertBefore(section,empty)'))fail('Today cards must support account-defined visibility and order');
if(!page.includes('표시할 오늘 화면 항목이 없습니다.')||!page.includes('id="todayLayoutEmpty"'))fail('Today all-disabled empty state is missing');
if(!app.includes("$('#todayHabitSettings').addEventListener('click'")||!app.includes("$('#habitConfig')")||!app.includes('settings.open=true'))fail('Habit settings shortcut must open the calendar habit settings');
for(const hook of ['todayProteinTotal','todayProteinLabel','todayProteinGrams','todayProteinAdd','todayFinanceType','todayFinanceTitle','todayFinanceAmount','todayFinanceCategory','todayFinanceAdd','todayBudgetRemaining','todayBudgetBar'])if(!html.includes(`id="${hook}"`))fail(`Today optional hook is missing: ${hook}`);
const budgetCard=page.match(/data-today-section="budget"[\s\S]*?<\/section>/)?.[0]||'';
if(!budgetCard.includes('id="todayBudgetRemaining"')||!budgetCard.includes('id="todayBudgetBar"')||!budgetCard.includes('data-today-finance-type="expense"')||!budgetCard.includes('data-today-finance-type="income"'))fail('Today budget card must show the Stitch gauge and expense/income toggle');
if(!app.includes('bar.style.width='))fail('Budget bar width must be set through CSSOM (no style attribute)');
for(const removed of ['<h3>오늘의 문장</h3>','<h3>중요한 날짜</h3>','<h3>오늘 할 일</h3>','<h3>반복 습관</h3>','id="todayFinanceDate"'])if(page.includes(removed))fail(`Removed Today element remains: ${removed}`);

console.log('today page contract: PASS');
