import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../js/finance-utils.js';
// DOM test double: validates UI state transitions, not browser layout.
class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.textContent='';this.value='';this.classList={toggle(){}}}
  append(...children){this.children.push(...children)}
  replaceChildren(...children){this.children=children}
  setAttribute(){}
  addEventListener(name,fn){this.listeners[name]=fn}
  focus(){}
  scrollIntoView(){}
  async trigger(name){await this.listeners[name]?.()}
}
const nodes=new Map(),root={querySelector:s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s)}};
const context={window:{},document:{createElement:tag=>new Element(tag)}};
vm.runInNewContext(fs.readFileSync('js/budget-ui.js','utf8'),context);
let active='2026-10',user='a',failSave=false,resolveSave,saveCalls=0;
const saved={month:'2026-10-01',revision:1,status:'saved',items:{'식비':300000}};
const db={user:()=>({id:user}),today:()=> '2026-10-14',getMonthBudget:async month=>({...saved,month:month+'-01',items:{...saved.items}}),saveMonthBudget:async(month,items,revision)=>{saveCalls++;assert.equal(revision,1);if(failSave)throw new Error('network');await new Promise(r=>resolveSave=r);return{...saved,revision:2,items}}};
let ui;const render=()=>ui.render(active,[{tx_type:'expense',amount:100000,category:'식비',tx_date:'2026-10-01'}],['식비','교통']);
ui=context.window.HaruBudgetUI.create({db,finance:globalThis.HaruFinance,root,onChange:render});
await ui.load(active);render();
assert.equal(root.querySelector('#financeBudgetRemaining').textContent,'₩200,000');
const input=()=>root.querySelector('#budgetRows').children[0].children[1];
input().value='0';await input().trigger('input');
active='2026-11';await ui.load(active);active='2026-10';render();
assert.equal(input().value,'0','draft must survive switching months');
failSave=true;await root.querySelector('#budgetSave').trigger('click');
assert.equal(input().value,'0');assert.match(root.querySelector('#budgetStatus').textContent,/network/);
failSave=false;
const pending=root.querySelector('#budgetSave').trigger('click');
await root.querySelector('#budgetSave').trigger('click');
assert.equal(saveCalls,2,'one failed attempt and one pending attempt; duplicate click ignored');
resolveSave();await pending;
assert.equal(root.querySelector('#financeBudgetRemaining').textContent,'₩100,000 초과');
assert.match(root.querySelector('#budgetStatus').textContent,/저장했습니다/);
input().value='123';await input().trigger('input');user='b';
await ui.load(active);render();assert.notEqual(input().value,'123','draft must not leak into another account');
console.log('budget UI state: PASS (draft/month switch, save failure, duplicate click, over budget, account isolation)');
