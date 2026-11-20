/* Recurring transaction rule editor. Server jobs create ledger rows; this file only manages rules. */
(function(global){
'use strict';
function create({db,root=document,onSaved=async()=>{}}){
 const q=s=>root.querySelector(s);let rules=[],loaded=false,busy=false,editing=null,previewKey='',owner='',request=0;
 const fields=['tx_type','title','category','amount','record_day','start_date','end_date','timezone'];
 const input=k=>q('#recurring_'+k);const msg=t=>q('#recurringStatus').textContent=t;
 const categories={expense:['식비','교통','쇼핑','생활','교육','세금','기타'],income:['급여','용돈','기타']};
 function category(value){input('category').replaceChildren(...[...new Set([...categories[input('tx_type').value],...(value?[value]:[])])].map(c=>{const o=document.createElement('option');o.textContent=c;o.value=c;return o}));if(value)input('category').value=value}
 function scope(){const uid=db.user()?.id||'';if(uid!==owner){owner=uid;rules=[];loaded=false;editing=null;previewKey='';q('#recurringForm').hidden=true;request++}return uid}
 function values(){return Object.fromEntries(fields.map(k=>[k,input(k).value]))}
 function signature(){return JSON.stringify(values())}
 function invalid(){previewKey='';q('#recurringSave').disabled=true;q('#recurringNext').textContent='설정을 입력한 뒤 예정일을 확인해 주세요.'}
 function lock(value){busy=value;for(const el of q('#recurringForm').querySelectorAll('input,select,button'))el.disabled=value;q('#recurringSave').disabled=value||previewKey!==signature();q('#recurringAdd').disabled=value;q('#recurringRefresh').disabled=value}
 function el(tag,text,className){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(className)x.className=className;return x}
 // Stitch 가계부 rows (2026-11-20): name + status badge, detail line, right-aligned actions; paused/ended rows are muted.
 const BTN={edit:'px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white border border-[#E9E8E5] text-[#424844] hover:bg-[#F4F3F0] min-h-[32px]',pause:'px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white border border-[#E9E8E5] text-[#424844] hover:bg-[#F4F3F0] min-h-[32px]',resume:'px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#EBF7F0] text-[#1E3A2F] border border-[#C3ECD6] hover:bg-[#E0F2E9] min-h-[32px]',end:'px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white border border-[#FAD4D1] text-[#B45650] hover:bg-[#FDF0EE] min-h-[32px]'};
 function render(){
  scope();q('#recurringSummary').textContent=`정기 수입·지출${loaded?' '+rules.filter(r=>r.status!=='ended').length+'개':''}`;
  const host=q('#recurringList');host.replaceChildren();
  if(!loaded)return;
  if(!rules.length)host.append(el('p','등록한 정기 거래가 없습니다.','text-xs text-[#8E928F] leading-relaxed'));
  for(const r of rules){const active=r.status==='active',row=el('div',undefined,active?'p-3 rounded-xl border border-[#F0EFEA] bg-[#FAF9F7] space-y-2':'p-3 rounded-xl border border-[#F0EFEA] bg-[#FAF9F7] opacity-90 space-y-2'),head=el('div',undefined,'flex items-center justify-between'),name=el('span',r.title,active?'text-xs font-bold text-[#1A1C1A]':'text-xs font-bold text-[#8E928F]'),status=el('span',active?`사용 중 · ${r.next_due?'다음 '+r.next_due:'예정 없음'}`:{paused:'일시정지',ended:'종료'}[r.status]||r.status,active?'text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF7F0] text-[#1E3A2F]':'text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F3F0] text-[#8E928F]'),detail=el('div',`${r.tx_type==='income'?'수입':'지출'} · ${r.category} · ${Number(r.amount).toLocaleString('ko-KR')}원 · 매월 ${r.record_day}일`,active?'text-[11px] text-[#424844]':'text-[11px] text-[#8E928F]'),actions=el('div',undefined,'flex items-center justify-end gap-1.5 pt-1');head.append(name,status);row.append(head,detail);
   if(r.last_error)row.append(el('p',r.last_error,'text-[11px] text-[#B45650]'));
   if(r.status!=='ended'){
    for(const [label,action] of [['수정','edit'],[r.status==='paused'?'다시 시작':'일시정지',r.status==='paused'?'resume':'pause'],['종료','end']]){const b=el('button',label,BTN[action]);b.type='button';b.disabled=busy;b.addEventListener('click',async()=>{if(busy)return;if(action==='edit'){open(r);return}if(action==='end'&&b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.textContent='종료 확인';msg('종료 확인을 누르면 이후 자동 기록을 중단합니다. 과거 거래는 유지됩니다.');return}lock(true);const user=owner;try{await db.setRecurringStatus(r.id,action,r.revision);if(user!==scope())return;await load();await onSaved();msg('정기 거래 상태를 변경했습니다.')}catch(e){msg(e.message)}finally{lock(false);render()}});actions.append(b)}
   }row.append(actions);host.append(row);
  }
 }
 async function load(){const user=scope(),seq=++request;msg('정기 거래를 불러오는 중…');try{const data=await db.listRecurring();if(user!==scope()||seq!==request)return;rules=data;loaded=true;render();msg('')}catch(e){if(user===scope()&&seq===request)msg(e.message+' 다시 불러오기를 눌러 주세요.')}}
 function open(r=null){editing=r;const zone=localStorage.getItem(`lab:timezone:${db.user().id}`)||'Asia/Seoul';const defaults={tx_type:'expense',title:'',category:'식비',amount:'',record_day:'1',start_date:db.today(),end_date:'',timezone:zone};for(const k of fields)if(k!=='category')input(k).value=r?.[k]??defaults[k];category(r?.category||defaults.category);q('#recurringForm').hidden=false;q('#recurringFormTitle').textContent=r?'정기 거래 수정':'새 정기 거래 등록';invalid();input('title').focus()}
 fields.forEach(k=>input(k).addEventListener('input',()=>{if(k==='tx_type')category();invalid()}));
 q('#recurringAdd').onclick=()=>open();q('#recurringCancel').onclick=()=>{q('#recurringForm').hidden=true;editing=null;invalid()};q('#recurringRefresh').onclick=()=>void load();
 q('#recurringPanel').addEventListener('toggle',()=>{if(q('#recurringPanel').open&&!busy)void load()});
 q('#recurringPreview').onclick=async()=>{if(busy)return;const data=values(),key=JSON.stringify(data),user=scope();lock(true);try{const p=await db.previewRecurring(editing?.id||null,data);if(user!==scope())return;if(signature()===key){previewKey=p.next_due?key:'';q('#recurringNext').textContent=p.next_due?`다음 기록 예정일: ${p.next_due}${editing?.status==='paused'?' (일시정지 유지, 다시 시작할 때 재계산)':''}`:'설정한 기간 안에 기록 예정일이 없습니다.';msg('')}}catch(e){invalid();msg(e.message)}finally{lock(false)}};
 q('#recurringForm').addEventListener('submit',async e=>{e.preventDefault();if(busy||previewKey!==signature())return;const user=scope();lock(true);try{await db.saveRecurring(editing?.id||null,values(),editing?.revision||0);if(user!==scope())return;q('#recurringForm').hidden=true;editing=null;previewKey='';await load();await onSaved();msg('정기 거래를 저장했습니다. 예정일 이후 첫 정상 서버 실행에서 기록됩니다.')}catch(error){msg(error.message)}finally{lock(false);render()}});
 return{render,load};
}
global.HaruRecurringUI={create};
})(window);
