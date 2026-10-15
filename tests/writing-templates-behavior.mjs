import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../js/writing-templates.js';
const T=globalThis.HaruWritingTemplates;
for(const key of ['day','gratitude','thought']){
 const first=T.append('',key);assert.ok(first.changed);assert.ok(first.body.length);
 assert.equal(T.append(first.body,key).changed,false);
 assert.equal(T.append('원래 본문\n',key).body,'원래 본문\n\n\n'+first.body);
 assert.throws(()=>T.append('가'.repeat(12000),key),/최대/);
 assert.equal(T.append('',key,first.body.length).body,first.body);
}
assert.equal(T.append('기존 본문','free').body,'기존 본문');
assert.equal(T.append('','free').changed,false);
// Event/DOM doubles exercise actual picker code; no browser layout claims.
class El{
 constructor(){this.value='';this.hidden=true;this.maxLength=12000;this.handlers={};this.dataset={};this.classList={add(){}}}
 addEventListener(k,f){this.handlers[k]=f} setAttribute(){} focus(){} setSelectionRange(){}
 dispatchEvent(e){this.handlers[e.type]?.(e)}
 click(){this.handlers.click?.()}
}
const body=new El(),button=new El(),panel=new El(),hint=new El(),choice=new El();choice.dataset.writingTemplate='day';panel.querySelectorAll=()=>[choice];let inputCount=0;body.addEventListener('input',()=>inputCount++);
T.bind({body,button,panel,hint,notify(){}});assert.equal(body.value,'');button.click();choice.click();choice.click();assert.equal(inputCount,1);button.click();assert.match(hint.textContent,/아래/);choice.click();assert.equal(inputCount,1);

// Execute existing app payload/autosave/restore/save functions against a durable
// test store. This is integration with doubles, not Supabase or IndexedDB QA.
const source=fs.readFileSync('js/app.js','utf8');
function extract(name){const re=new RegExp('^  (?:async )?function '+name+'\\(', 'm'),start=source.search(re);assert.ok(start>=0,name);const tail=source.slice(start+1),end=tail.search(/\n  (?:async )?function /);return source.slice(start,end<0?source.length:start+1+end)}
const names=['diaryDraftPayload','scheduleDiaryDraft','restoreDiaryDraft','resetDiary','saveDiary','draftPayload','scheduleDraft','restoreDraft','resetRecordComposer','saveRecord'];
const store=new Map(),saved=[];
function harness(){
 const elements=new Map(),$=s=>{if(!elements.has(s))elements.set(s,new El());return elements.get(s)};
 const timers=new Map();let timer=0;
 const state={diaryEdit:null,recordEdit:null,newDiaryFiles:[],newRecordFiles:[]};
 const context={state,$,Date,console,DB:{user:()=>({id:'test'}),today:()=> '2026-10-14',createRecord:async p=>{const row={id:String(saved.length),...structuredClone(p)};saved.push(row);return row},updateRecord:async(id,p)=>{const row={id,...structuredClone(p)};saved.push(row);return row}},Drafts:{set:async(k,v)=>store.set(k,structuredClone(v)),get:async k=>structuredClone(store.get(k)),del:async k=>store.delete(k)},diaryDraftKey:()=> 'diary:test',setTimeout:f=>{timers.set(++timer,f);return timer},clearTimeout:id=>timers.delete(id),toast(){},setBusy(){},withError:f=>f(),Storage:{uploadRecordImages:async()=>{}},clearDiaryFiles(){state.newDiaryFiles=[]},clearPreviewUrls(){state.newRecordFiles=[]},renderDiaryFiles(){},renderNewRecordFiles(){},loadDiary:async()=>{},loadRecords:async()=>{}};
 vm.createContext(context);vm.runInContext(names.map(extract).join('\n'),context);
 return{context,$,state,flush:async()=>{for(const f of [...timers.values()])await f();timers.clear()},timers};
}
for(const kind of ['diary','record']){
 store.clear();const h=harness(),c=h.context;
 h.$('#'+kind+'Date').value='2026-10-03';h.$('#'+kind+'Body').value=T.append('사진과 함께 적은 글','gratitude').body;
 h.$('#diaryTitle').value='제목';h.$('#diaryMood').value='😌 평온';h.$('#recordTags').value='생각';
 const schedule=kind==='diary'?'scheduleDiaryDraft':'scheduleDraft',restore=kind==='diary'?'restoreDiaryDraft':'restoreDraft',save=kind==='diary'?'saveDiary':'saveRecord';
 c[schedule]();await h.flush();const expected=h.$('#'+kind+'Body').value;
 const fresh=harness();await fresh.context[restore]();assert.equal(fresh.$('#'+kind+'Body').value,expected);assert.equal(fresh.$('#'+kind+'Date').value,'2026-10-03');
 if(kind==='diary'){assert.equal(fresh.$('#diaryMood').value,'😌 평온');assert.equal(fresh.$('#diaryTitle').value,'제목')}
 await fresh.context[save]();assert.equal(saved.at(-1).body,expected);assert.equal(saved.at(-1).entry_date,'2026-10-03');
 // Read saved payload back into editor, then edit without automatic template insertion.
 fresh.$('#'+kind+'Body').value=saved.at(-1).body;assert.equal(fresh.$('#'+kind+'Body').value,expected);
 c[schedule]();c[kind==='diary'?'resetDiary':'resetRecordComposer']();assert.equal(h.timers.size,0,'cancel/save reset must cancel pending autosave');
}
console.log('writing templates: PASS (append/preserve/free/duplicate/length, picker events, real app save payload, simulated reload draft restoration, cancel timers)');
