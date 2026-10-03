import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/finance-utils.js','utf8'),context);
const {currentBalance}=context.HaruFinance;

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

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8'),css=fs.readFileSync('assets/light-theme.css','utf8');
assert.match(html,/<option>세금<\/option>/);
assert.match(html,/<option value="balance">시작 잔액<\/option>/);
assert.match(html,/id="financeBalance">₩0<\/strong><\/div><div class="money-card"><span>선택한 달 순흐름<\/span><strong id="financeNet"/);
assert.match(app,/Finance\.currentBalance\(state\.finance,DB\.today\(\)\)\.total/);
assert.match(app,/class="link-btn danger" data-delete-finance/);
assert.match(css,/\.transaction-copy strong\{font-size:15px/);
assert.match(css,/grid-template-areas:'copy amount' 'copy actions'/);

console.log('finance balance contract: PASS');
