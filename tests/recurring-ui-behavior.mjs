import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// Behavioral DOM double; actual mobile layout is checked after deployment.
class Element {
 constructor(){this.children=[];this.listeners={};this.value='';this.dataset={};}
 append(...x){this.children.push(...x)}
 replaceChildren(...x){this.children=x}
 addEventListener(k,f){this.listeners[k]=f}
 focus(){}
 querySelectorAll(){return []}
 async fire(k){return (this.listeners[k]||this['on'+k])?.({preventDefault(){}})}
}
const nodes=new Map(),root={querySelector(s){if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s)}};
const q=s=>root.querySelector('#'+s);
const context={window:{},document:{createElement:()=>new Element()},localStorage:{getItem:()=>null}};
vm.runInNewContext(fs.readFileSync('js/recurring-ui.js','utf8'),context);
let owner='a',saved=[],fail=false,release,calls=0;
const db={user:()=>({id:owner}),today:()=> '2026-10-15',listRecurring:async()=>saved,
 previewRecurring:async()=>({next_due:'2026-11-01',timezone:'Asia/Seoul'}),
 saveRecurring:async(id,data)=>{calls++;if(fail)throw new Error('network');await new Promise(r=>release=r);saved=[{...data,id:'r1',revision:1,status:'active'}]},setRecurringStatus:async()=>{}};
const ui=context.window.HaruRecurringUI.create({db,root});ui.render();await ui.load();
await q('recurringAdd').fire('click');q('recurring_title').value='월세';q('recurring_amount').value='500000';
await q('recurringPreview').fire('click');assert.equal(q('recurringSave').disabled,false);
q('recurring_amount').value='600000';await q('recurring_amount').fire('input');assert.equal(q('recurringSave').disabled,true);
await q('recurringPreview').fire('click');fail=true;await q('recurringForm').fire('submit');assert.match(q('recurringStatus').textContent,/network/);assert.equal(q('recurring_title').value,'월세');
fail=false;const pending=q('recurringForm').fire('submit');await q('recurringForm').fire('submit');assert.equal(calls,2);release();await pending;
assert.equal(q('recurringForm').hidden,true);assert.equal(q('recurringList').children.length,1);
await q('recurringAdd').fire('click');owner='b';ui.render();assert.equal(q('recurringForm').hidden,true);assert.equal(q('recurringList').children.length,0);
console.log('recurring UI: PASS (preview invalidation, failure retains draft, duplicate submit, save refresh, account isolation)');
