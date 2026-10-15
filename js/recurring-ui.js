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
 function el(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x}
 function render(){
  scope();q('#recurringSummary').textContent=`정기 수입·지출${loaded?' · 사용 중 '+rules.filter(r=>r.status==='active').length+'개':''}`;
  const host=q('#recurringList');host.replaceChildren();
  if(!loaded)return;
  if(!rules.length)host.append(el('p','등록한 정기 거래가 없습니다.'));
  for(const r of rules){const row=el('article'),name=el('strong',r.title),detail=el('p',`${r.tx_type==='income'?'수입':'지출'} · ${r.category} · ₩${Number(r.amount).toLocaleString('ko-KR')} · 매월 ${r.record_day}일`),status=el('p',`${{active:'사용 중',paused:'일시정지',ended:'종료'}[r.status]} · ${r.next_due?'다음 '+r.next_due:'예정 없음'} · ${r.timezone}`),actions=el('div');row.className='recurring-item';actions.className='recurring-actions';row.append(name,detail,status);
   if(r.last_error)row.append(el('p',r.last_error));
   if(r.status!=='ended'){
    for(const [label,action] of [['수정','edit'],[r.status==='paused'?'다시 시작':'일시정지',r.status==='paused'?'resume':'pause'],['종료','end']]){const b=el('button',label);b.type='button';b.className='btn ghost small';b.disabled=busy;b.addEventListener('click',async()=>{if(busy)return;if(action==='edit'){open(r);return}if(action==='end'&&b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.textContent='종료 확인';msg('종료 확인을 누르면 이후 자동 기록을 중단합니다. 과거 거래는 유지됩니다.');return}lock(true);const user=owner;try{await db.setRecurringStatus(r.id,action,r.revision);if(user!==scope())return;await load();await onSaved();msg('정기 거래 상태를 변경했습니다.')}catch(e){msg(e.message)}finally{lock(false);render()}});actions.append(b)}
   }row.append(actions);host.append(row);
  }
 }
 async function load(){const user=scope(),seq=++request;msg('정기 거래를 불러오는 중…');try{const data=await db.listRecurring();if(user!==scope()||seq!==request)return;rules=data;loaded=true;render();msg('')}catch(e){if(user===scope()&&seq===request)msg(e.message+' 다시 불러오기를 눌러 주세요.')}}
 function open(r=null){editing=r;const zone=localStorage.getItem(`lab:timezone:${db.user().id}`)||'Asia/Seoul';const defaults={tx_type:'expense',title:'',category:'식비',amount:'',record_day:'1',start_date:db.today(),end_date:'',timezone:zone};for(const k of fields)if(k!=='category')input(k).value=r?.[k]??defaults[k];category(r?.category||defaults.category);q('#recurringForm').hidden=false;q('#recurringFormTitle').textContent=r?'정기 거래 수정':'정기 거래 추가';invalid();input('title').focus()}
 fields.forEach(k=>input(k).addEventListener('input',()=>{if(k==='tx_type')category();invalid()}));
 q('#recurringAdd').onclick=()=>open();q('#recurringCancel').onclick=()=>{q('#recurringForm').hidden=true;editing=null;invalid()};q('#recurringRefresh').onclick=()=>void load();
 q('#recurringPanel').addEventListener('toggle',()=>{if(q('#recurringPanel').open&&!busy)void load()});
 q('#recurringPreview').onclick=async()=>{if(busy)return;const data=values(),key=JSON.stringify(data),user=scope();lock(true);try{const p=await db.previewRecurring(editing?.id||null,data);if(user!==scope())return;if(signature()===key){previewKey=p.next_due?key:'';q('#recurringNext').textContent=p.next_due?`다음 기록 예정일 ${p.next_due} · ${p.timezone}${editing?.status==='paused'?' (일시정지 유지, 다시 시작할 때 재계산)':''}`:'설정한 기간 안에 기록 예정일이 없습니다.';msg('')}}catch(e){invalid();msg(e.message)}finally{lock(false)}};
 q('#recurringForm').addEventListener('submit',async e=>{e.preventDefault();if(busy||previewKey!==signature())return;const user=scope();lock(true);try{await db.saveRecurring(editing?.id||null,values(),editing?.revision||0);if(user!==scope())return;q('#recurringForm').hidden=true;editing=null;previewKey='';await load();await onSaved();msg('정기 거래를 저장했습니다. 예정일 이후 첫 정상 서버 실행에서 기록됩니다.')}catch(error){msg(error.message)}finally{lock(false);render()}});
 return{render,load};
}
global.HaruRecurringUI={create};
})(window);
