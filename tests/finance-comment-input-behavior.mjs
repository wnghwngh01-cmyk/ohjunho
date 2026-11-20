import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('js/app.js','utf8');

// #7 Category options follow the transaction type (both the 가계부 form and the Today quick entry).
const cats=app.match(/const FINANCE_CATEGORIES=(\{[^;]*\});/)?.[1];
const fn=app.match(/function syncFinanceCategories\([^\n]*/)?.[0];
assert.ok(cats&&fn,'finance category helper exists');
function makeSelect(options,value){return{value,options,set innerHTML(html){this.options=[...html.matchAll(/<option>([^<]*)<\/option>/g)].map(m=>m[1]);if(!this.options.includes(this.value))this.value=this.options[0]},get innerHTML(){return''}}}
const els={financeType:{value:'expense'},financeCategory:makeSelect(['식비','교통','급여'],'교통'),todayFinanceCategory:makeSelect([],'식비')};
const ctx={$:sel=>els[sel.replace('#','')]||null};
vm.runInNewContext(`const FINANCE_CATEGORIES=${cats};${fn};this.sync=syncFinanceCategories;`,ctx);
ctx.sync();
assert.deepEqual(els.financeCategory.options,['식비','교통','쇼핑','생활','교육','세금','기타']);
assert.equal(els.financeCategory.value,'교통','a still-valid selection is kept');
els.financeType.value='income';ctx.sync({type:'change'});
assert.deepEqual(els.financeCategory.options,['급여','용돈','기타'],'income shows income categories only');
assert.equal(els.financeCategory.value,'급여','an expense category left selected switches to the first income category');
els.financeType.value='expense';ctx.sync({type:'change'});
assert.equal(els.financeCategory.value,'식비');
ctx.sync('todayFinanceCategory','income');
assert.deepEqual(els.todayFinanceCategory.options,['급여','용돈','기타'],'Today quick entry uses the same lists');
assert.match(app,/syncFinanceCategories\('todayFinanceCategory',value\)\}/,'Today type toggle refreshes its categories');
assert.match(app,/\$\('#financeType'\)\.addEventListener\('change',syncFinanceCategories\)/);

// #12 Comment Enter submits through a form (no submit while a Korean IME composition is active) and cannot double-post.
assert.match(app,/<form class="comment-compose" data-comment-form="\$\{p\.id\}" novalidate><input class="input" data-comment-input="\$\{p\.id\}"[^>]*enterkeyhint="send"/);
assert.match(app,/<button type="button" class="btn primary small" data-submit-comment="\$\{p\.id\}"/,'the 등록 button stays a click path, not a second submit');
assert.match(app,/document\.addEventListener\('submit',event=>\{const form=event\.target\.closest\?\.\('\[data-comment-form\]'\);if\(!form\)return;event\.preventDefault\(\);void submitComment\(form\.dataset\.commentForm\)\}\)/);
assert.match(app,/if\(!body\|\|commentInFlight\.has\(pubId\)\)return;/,'concurrent Enter + tap cannot post twice');
assert.match(app,/finally\{commentInFlight\.delete\(pubId\)\}/);

console.log('finance category + comment input behavior: PASS');
