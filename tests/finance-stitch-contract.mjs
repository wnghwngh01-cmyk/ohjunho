import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Stitch 가계부 ("가계부 (Account 메인 최종 수정본)", 2026-11-20) applied to #page-personal.
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../assets/finance-stitch.css',import.meta.url),'utf8');
const generated=fs.readFileSync(new URL('../assets/finance-stitch.generated.css',import.meta.url),'utf8');
const start=html.indexOf('<section id="page-personal"'),next=html.indexOf('<section id="page-',start+1);
const page=start>=0?html.slice(start,next>start?next:undefined):'';
assert.ok(page,'가계부 section exists');

// User decisions: no page title / bell at the top (bell only on Today); the month's records can be collapsed.
assert.doesNotMatch(page,/<header\b|<h1\b|data-go="notifications"|class="page-head"/,'가계부 has no title header and no bell');
assert.match(page,/<details id="financeListPanel" class="group" open>\s*<summary[^>]*>\s*<span id="financeSearchSummary"[^>]*>선택한 달 0개<\/span>[\s\S]*?<\/summary>\s*<div id="transactionList"/,'선택한 달 기록 is collapsible and open by default');
assert.doesNotMatch(page,/style\s*=/,'no style attributes (CSP style-src self)');
assert.doesNotMatch(html,/id="module-finance"|personalFinanceHost|data-module="finance"/,'the old lab finance pane is gone');

// Stitch markup kept: sample class strings from the final design file.
for(const cls of [
  'bg-white rounded-2xl p-4 border border-[#F0EFEA] shadow-[0_2px_8px_rgba(0,0,0,0.025)] space-y-3',
  'grid grid-cols-2 p-1 bg-[#F4F3F0] rounded-xl gap-1',
  'w-full py-3 text-xs font-bold rounded-xl bg-[#1E3A2F] hover:bg-[#162C23] active:bg-[#162C23] text-white transition-all flex items-center justify-center min-h-[44px]',
  'mt-2.5 p-3 rounded-xl bg-[#FAF9F6] border border-[#F0EFEA] space-y-2.5',
  'group bg-white rounded-2xl p-4 border border-[#F0EFEA] shadow-[0_2px_8px_rgba(0,0,0,0.025)]',
  'p-3.5 rounded-xl bg-[#FAF9F6] border border-[#F0EFEA] space-y-2.5'
])assert.ok(page.includes(`class="${cls}"`),`Stitch class kept: ${cls}`);
for(const label of ['이번 달','금액 (원)','내용 (선택)','지출 저장하기','기록 검색','초기화','예산 설정·수정','이 분류 예산 저장','다시 불러오기','매월 기록일 (1~31)','종료일 (비워두면 계속)','예정일 확인','수입·지출 분석'])assert.ok(page.includes(label),`label: ${label}`);
for(const id of ['financeMonthLabel','financePrevMonth','financeThisMonth','financeNextMonth','financeBudgetLabel','budgetOpen','financeBudgetRemaining','financeBudgetTotal','financeBudgetBar','financeIncome','financeExpense','financeNet','financeType','financeAmount','financeCategoryChips','financeCategory','financeTitle','financeDate','financeAdd','financeSearchPanel','financeSearchToggle','financeSearchName','financeSearchDate','financeSearchType','financeSearchCategory','financeSearchReset','financeListPanel','financeSearchSummary','transactionList','financeBudgetPanel','budgetSummary','budgetHint','budgetRows','budgetUnassigned','budgetEditPanel','budgetCategory','budgetSelected','budgetSelectedUsage','budgetAmount','budgetReload','budgetSave','budgetStatus','recurringPanel','recurringSummary','recurringList','recurringRefresh','recurringAdd','recurringForm','recurringFormTitle','recurring_tx_type','recurring_category','recurring_title','recurring_amount','recurring_record_day','recurring_start_date','recurring_end_date','recurring_timezone','recurringPreview','recurringNext','recurringSave','recurringCancel','recurringStatus','financeAnalysis','financeAnalysisExpense','financeAnalysisIncome','financeCategorySummary'])assert.match(page,new RegExp(`id="${id}"`),`hook ${id}`);
assert.match(page,/<details id="financeBudgetPanel"[^>]*>/);assert.doesNotMatch(page,/<details id="(financeBudgetPanel|recurringPanel|financeAnalysis|budgetEditPanel)"[^>]*\sopen/,'budget, recurring and analysis start closed');

// Behavior wiring.
assert.match(app,/function setFinanceType\(type\)/);assert.match(app,/function renderFinanceChips\(\)/);
assert.match(app,/function startFinanceEdit\(id\)/);assert.match(app,/async function saveFinanceEdit\(button\)/);
assert.doesNotMatch(app,/prompt\('금액'/,'no prompt() pop-ups for editing');
assert.match(app,/if\(!confirm\('이 가계부 기록을 삭제할까요\?'\)\)return;/,'deleting asks first');
assert.match(app,/Views\.financeTxList\(rows\.slice\(0,80\),state\.financeEdit,financeCategoriesFor\)/);

// Templates: grouped by date, inline editor in place, legacy balance rows, no style attributes.
const ctx={globalThis:{}};vm.runInNewContext(fs.readFileSync(new URL('../js/stitch-views.js',import.meta.url),'utf8'),ctx);
const V=ctx.globalThis.HaruStitchViews;
const rows=[{id:'a',tx_type:'expense',title:'점심',category:'식비',amount:12000,tx_date:'2026-11-20'},{id:'b',tx_type:'income',title:'급여',category:'급여',amount:50000,tx_date:'2026-11-20'},{id:'c',tx_type:'expense',title:'정기 배송',category:'식비',amount:48000,tx_date:'2026-11-15',recurring_rule_id:'r'},{id:'d',tx_type:'balance',title:'전월 잔액',category:'시작 잔액',amount:1150000,tx_date:'2026-11-01'}];
const cats=t=>({expense:['식비','교통','쇼핑','생활','교육','세금','기타'],income:['급여','용돈','기타']}[t]||[]);
const list=V.financeTxList(rows,null,cats);
assert.equal((list.match(/tracking-tight">11월 \d+일 [일월화수목금토]요일</g)||[]).length,3,'one header per day');
assert.match(list,/11월 20일 금요일/);assert.match(list,/11월 1일 일요일/);
assert.match(list,/-12,000원/);assert.match(list,/text-\[#1E3A2F\]">\+50,000원/);assert.match(list,/정기 · 식비/);
assert.match(list,/text-\[#8E928F\]">1,150,000원/);assert.match(list,/이전 시작 잔액/);
assert.doesNotMatch(list,/style=|rounded-full bg-\[#1E3A2F\] flex-shrink-0/,'no style attributes and no row dots');
const editing=V.financeTxList(rows,'a',cats);
assert.match(editing,/data-finance-edit-row="a"[^>]*>[\s\S]*?거래 수정/);
assert.equal((editing.match(/<option/g)||[]).length,7,'expense editor offers the 7 expense categories');
assert.doesNotMatch(editing,/data-edit-finance="a"/,'edited row is replaced in place');
const analysis=V.financeAnalysis([['식비',180000],['쇼핑',135000],['교통',65000]],380000,'expense');
assert.equal((analysis.match(/<circle/g)||[]).length,4,'background ring + one segment per category');
assert.match(analysis,/총지출/);assert.match(analysis,/380,000원/);assert.doesNotMatch(analysis,/style=/);

// Build and cache wiring.
assert.match(shell,/#page-personal details\[open\]>summary \.chevron-arrow\{transform:rotate\(180deg\)\}/);
assert.match(generated,/#page-personal \*,[^{]*\{[^}]*(border-style:solid|border:0 solid)/,'border defaults restored inside #page-personal');
for(const asset of ['finance-stitch.css?v=20261120-finance-v1','finance-stitch.generated.css?v=20261120-finance-v1']){assert.ok(html.includes(asset),asset);assert.ok(sw.includes(asset),`sw ${asset}`)}

console.log('finance Stitch contract: PASS (no header/bell, collapsible list, Stitch markup, inline edit, grouping, analysis)');
