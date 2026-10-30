import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../js/finance-utils.js';
const budgetCss=fs.readFileSync('assets/budget.css','utf8');
assert.match(budgetCss,/#financeBudgetPanel\{scroll-margin-top:84px\}/);
assert.match(budgetCss,/@media\(max-width:760px\)\{#financeBudgetPanel\{scroll-margin-top:calc\(124px \+ var\(--safe-top, 0px\)\)\}\}/);
// DOM test double: validates UI state transitions, not browser layout.
const actions=[];
class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.textContent='';this.value='';this.style={};this.classList={toggle(){}}}
  append(...children){this.children.push(...children)}
  replaceChildren(...children){this.children=children}
  setAttribute(){}
  addEventListener(name,fn){this.listeners[name]=fn}
  focus(options){actions.push({type:'focus',options})}
  scrollIntoView(options){actions.push({type:'scroll',options})}
  async trigger(name){await this.listeners[name]?.({currentTarget:this})}
}
const nodes=new Map(),root={querySelector:s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s)}};
const context={window:{},document:{createElement:tag=>new Element(tag)}};
vm.runInNewContext(fs.readFileSync('js/budget-ui.js','utf8'),context);
let active='2026-10',user='a',failSave=false,resolveSave,saveCalls=0,revision=1,lastSavedItems;
const saved={month:'2026-10-01',revision:1,status:'saved',items:{'식비':300000}};
const db={user:()=>({id:user}),today:()=> '2026-10-14',getMonthBudget:async month=>({...saved,month:month+'-01',items:{...saved.items}}),saveMonthBudget:async(month,items,expected)=>{saveCalls++;lastSavedItems=items;assert.equal(expected,revision);if(failSave)throw new Error('network');await new Promise(r=>resolveSave=r);revision++;return{...saved,revision,items}}};
let ui;const render=()=>ui.render(active,[{tx_type:'expense',amount:100000,category:'식비',tx_date:'2026-10-01'}],['식비','교통']);
ui=context.window.HaruBudgetUI.create({db,finance:globalThis.HaruFinance,root,onChange:render});
await ui.load(active);render();
assert.equal(root.querySelector('#financeBudgetRemaining').textContent,'₩200,000');
assert.equal(root.querySelector('#budgetRows').children.length,1,'only configured categories appear in overview');
assert.equal(root.querySelector('#budgetRows').children[0].children[1].children[0].style.width,'33.33333333333333%');
assert.equal(root.querySelector('#budgetSelected').hidden,true,'editor is empty until a category is chosen');
const select=root.querySelector('#budgetCategory');select.value='식비';await select.trigger('change');
const input=()=>root.querySelector('#budgetAmount');
assert.match(root.querySelector('#budgetSelectedUsage').textContent,/현재 예산 ₩300,000/);
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
assert.equal(root.querySelector('#budgetRows').children[0].children[1].children[0].style.width,'100%','over-budget meter is capped');
assert.match(root.querySelector('#budgetRows').children[0].children[2].children[0].textContent,/초과/);
await root.querySelector('#budgetOpen').trigger('click');
assert.equal(root.querySelector('#financeBudgetPanel').open,true);
assert.equal(root.querySelector('#budgetEditPanel').open,undefined,'overview does not open the editor');
assert.equal(actions.length,2);
assert.equal(actions[0].type,'focus');assert.equal(actions[0].options.preventScroll,true);
assert.equal(actions[1].type,'scroll');assert.equal(actions[1].options.behavior,'smooth');assert.equal(actions[1].options.block,'start');
select.value='교통';await select.trigger('change');
assert.match(root.querySelector('#budgetSelectedUsage').textContent,/예산 미설정/);
input().value='50000';await input().trigger('input');
assert.equal(root.querySelector('#budgetRows').children.length,1,'unsaved category is not shown in saved overview');
const add=root.querySelector('#budgetSave').trigger('click');await Promise.resolve();resolveSave();await add;
assert.equal(root.querySelector('#budgetRows').children.length,2,'newly saved category appears in overview');
assert.equal(lastSavedItems['식비'],0,'saving one category keeps the other saved budget');
assert.equal(lastSavedItems['교통'],50000);
input().value='123';await input().trigger('input');user='b';
await ui.load(active);render();assert.notEqual(input().value,'123','draft must not leak into another account');
console.log('budget UI state: PASS (draft/month switch, save failure, duplicate click, over budget, account isolation)');
