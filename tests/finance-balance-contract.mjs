import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/finance-utils.js','utf8'),context);
const {currentBalance,filterRows}=context.HaruFinance;

assert.equal(currentBalance([
  {tx_type:'income',amount:120000,tx_date:'2026-10-01'},
  {tx_type:'expense',amount:35000,tx_date:'2026-10-02'}
],'2026-10-03').total,85000,'시작 잔액 없이 수입과 지출만으로 현재 잔액을 계산해야 한다.');

const result=currentBalance([
  {tx_type:'balance',title:'현금',amount:50000,tx_date:'2026-09-01',created_at:'2026-09-01T00:00:00Z'},
  {tx_type:'balance',title:'현금',amount:70000,tx_date:'2026-09-10',created_at:'2026-09-10T00:00:00Z'},
  {tx_type:'balance',title:'은행',amount:300000,tx_date:'2026-09-05',created_at:'2026-09-05T00:00:00Z'},
  {tx_type:'income',amount:100000,tx_date:'2026-10-01'},
  {tx_type:'expense',amount:40000,tx_date:'2026-10-02'},
  {tx_type:'income',amount:999999,tx_date:'2026-10-04'}
],'2026-10-03');
assert.equal(result.starting,370000,'같은 이름의 시작 잔액은 최신 값만 사용해야 한다.');
assert.equal(result.total,430000,'시작 잔액에 오늘까지의 전체 순흐름을 반영해야 한다.');

const searchRows=[
  {id:'1',tx_type:'expense',title:'점심 식사',category:'식비',tx_date:'2026-10-03',created_at:'2026-10-03T12:00:00Z'},
  {id:'2',tx_type:'income',title:'10월 급여',category:'급여',tx_date:'2026-10-03',created_at:'2026-10-03T09:00:00Z'},
  {id:'3',tx_type:'balance',title:'국민은행',category:'시작 잔액',tx_date:'2026-10-01',created_at:'2026-10-01T09:00:00Z'},
  {id:'4',tx_type:'expense',title:'지하철',category:'교통',tx_date:'2026-09-30',created_at:'2026-09-30T09:00:00Z'}
];
assert.deepEqual(Array.from(filterRows(searchRows,{date:'2026-10-03'}),x=>x.id),['1','2'],'선택한 날짜의 거래만 찾아야 한다.');
assert.deepEqual(Array.from(filterRows(searchRows,{type:'expense'}),x=>x.id),['1','4'],'종류로 거래를 찾아야 한다.');
assert.deepEqual(Array.from(filterRows(searchRows,{query:'국민'}),x=>x.id),['3'],'이름 일부로 거래를 찾아야 한다.');
assert.deepEqual(Array.from(filterRows(searchRows,{category:'식비'}),x=>x.id),['1'],'분류로 거래를 찾아야 한다.');
assert.deepEqual(Array.from(filterRows(searchRows,{date:'2026-10-03',type:'expense',query:'점심',category:'식비'}),x=>x.id),['1'],'검색 조건을 함께 적용해야 한다.');

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8'),css=fs.readFileSync('assets/light-theme.css','utf8');
assert.match(html,/<option>세금<\/option>/);
assert.match(html,/<option value="balance">시작 잔액<\/option>/);
assert.match(html,/id="financeSearchDate" type="date"/);
assert.match(html,/id="financeSearchType"/);
assert.match(html,/id="financeSearchName"/);
assert.match(html,/id="financeSearchCategory"/);
assert.match(html,/id="financeBalance">₩0<\/strong><\/div><div class="money-card"><span>선택한 달 순흐름<\/span><strong id="financeNet"/);
assert.match(app,/Finance\.currentBalance\(state\.finance,DB\.today\(\)\)\.total/);
assert.match(app,/Finance\.filterRows\(month,filters\)/);
assert.match(app,/class="link-btn danger" data-delete-finance/);
assert.match(css,/\.transaction-copy strong\{font-size:15px/);
assert.match(css,/grid-template-areas:'copy amount' 'copy actions'/);

console.log('finance balance contract: PASS');
