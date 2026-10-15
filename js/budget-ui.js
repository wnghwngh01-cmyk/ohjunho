/* Private monthly budgets. Loading and unsaved drafts are scoped to user + month. */
(function(global){
  'use strict';
  function create({db,finance,root=document,onChange=()=>{}}){
    const entries=new Map();let owner='',activeMonth='';
    const q=s=>root.querySelector(s),money=n=>`${n<0?'-':''}₩${Math.abs(n).toLocaleString('ko-KR')}`;
    function scope(){const id=db.user()?.id||'';if(owner!==id){entries.clear();owner=id}return id}
    function entry(month){scope();if(!entries.has(month))entries.set(month,{phase:'idle',draft:null,data:null,busy:false,message:'',request:0});return entries.get(month)}
    async function load(month,force=false){
      const user=scope(),e=entry(month);if(e.phase==='loading'||(!force&&e.phase==='ready'))return;
      const request=++e.request;e.phase='loading';onChange();
      try{const data=await db.getMonthBudget(month);if(user!==scope()||request!==e.request)return;e.data=data;e.phase='ready';e.message='';}
      catch(error){if(user!==scope()||request!==e.request)return;e.phase='error';e.message=error.message||'예산을 불러오지 못했습니다.';}
      onChange();
    }
    function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
    function render(month,rows,categories){
      activeMonth=month;const e=entry(month),host=q('#budgetRows'),summary=q('#budgetSummary'),status=q('#budgetStatus');
      q('#financeBudgetLabel').textContent=`${month===db.today().slice(0,7)?'이번 달':month.replace('-','년 ')+'월'} 남은 예산`;
      host.replaceChildren();status.textContent=e.message;
      q('#budgetSave').disabled=e.phase!=='ready'||e.busy;
      q('#budgetReload').disabled=e.phase==='loading'||e.busy;
      q('#budgetSave').textContent=e.busy?'저장 중…':'이 달 예산 저장';
      if(e.phase!=='ready'){
        q('#financeBudgetRemaining').classList.toggle('budget-over',false);
        summary.textContent='월별 예산';q('#financeBudgetRemaining').textContent=e.phase==='error'?'조회 실패':'불러오는 중';
        q('#budgetUnassigned').textContent='';q('#budgetHint').textContent=e.phase==='error'?'다시 불러오기를 눌러 주세요. 입력 중인 값은 유지됩니다.':'저장된 예산을 확인하고 있습니다.';
        if(e.phase==='idle')void load(month);return;
      }
      const stats=finance.budgetSummary(rows,month,e.data.items);
      const remaining=q('#financeBudgetRemaining');remaining.textContent=stats.configured?(stats.remaining<0?`${money(-stats.remaining)} 초과`:money(stats.remaining)):'예산 설정하기';
      remaining.classList.toggle('budget-over',stats.remaining<0);
      summary.textContent=`월별 예산 · ${stats.configured?money(stats.budget)+' 설정':'미설정'}`;
      q('#budgetHint').textContent=e.data.status==='inherited'?`${e.data.source_month.slice(0,7)} 예산을 이어받을 예정입니다. 미래 월은 저장 전까지 미리보기입니다.`:e.data.status==='none'?'아직 이 달의 예산이 없습니다. 빈칸은 미설정, 0은 0원 예산입니다.':`${month} 저장된 예산입니다. 빈칸으로 저장하면 해당 분류의 예산을 해제합니다.`;
      if(e.draft)q('#budgetHint').textContent+=' 입력 중인 변경사항이 있습니다. 아래 사용액과 요약은 저장된 예산 기준입니다.';
      q('#budgetUnassigned').textContent=`예산 미설정 분류 지출 ${money(stats.unbudgeted)}`;
      const all=[...new Set([...categories,...Object.keys(e.data.items)])];
      all.forEach((category,index)=>{
        const saved=stats.categories.find(x=>x.category===category),row=node('div',undefined,'budget-row'),label=node('label',category),input=node('input');
        input.id=`budgetAmount${index}`;label.htmlFor=input.id;input.inputMode='numeric';input.placeholder='미설정';input.maxLength=15;input.disabled=e.busy;
        input.value=e.draft&&Object.hasOwn(e.draft,category)?e.draft[category]:Object.hasOwn(e.data.items,category)?Number(e.data.items[category]).toLocaleString('ko-KR'):'';
        input.setAttribute('aria-label',`${category} 월 예산 (원)`);
        input.addEventListener('input',()=>{if(!e.draft)e.draft=Object.fromEntries(all.map(c=>[c,Object.hasOwn(e.data.items,c)?String(e.data.items[c]):'']));e.draft[category]=input.value;e.message='저장하지 않은 변경사항이 있습니다.';status.textContent=e.message;});
        const used=rows.filter(x=>x.tx_type==='expense'&&x.tx_date?.startsWith(month)&&(x.category||'기타')===category).reduce((s,x)=>s+Number(x.amount),0);
        row.append(label,input,node('small',saved?`사용 ${money(saved.used)} · ${saved.remaining<0?'초과 '+money(-saved.remaining):'남음 '+money(saved.remaining)}`:`사용 ${money(used)} · 예산 미설정`));
        if(saved){const bar=node('progress');bar.max=100;bar.value=saved.percent;bar.setAttribute('aria-label',`${category} 예산 사용률`);row.append(bar);row.classList.toggle('budget-over',saved.remaining<0)}
        host.append(row);
      });
    }
    async function save(){
      const month=activeMonth,user=scope(),e=entry(month);if(e.phase!=='ready'||e.busy)return;
      const items={};
      try{for(const [category,value] of Object.entries(e.draft||e.data.items)){const amount=finance.parseBudget(value);if(amount!==null)items[category]=amount}}
      catch(error){e.message=error.message;q('#budgetStatus').textContent=e.message;return}
      e.busy=true;onChange();
      try{
        const data=await db.saveMonthBudget(month,items,e.data.revision);if(user!==scope())return;
        e.data=data;e.draft=null;e.message=`${month} 예산을 저장했습니다.`;
        // A save can seal other elapsed months; invalidate their server revision.
        for(const [key,value] of entries)if(key!==month){value.request++;value.phase='idle'}
      }catch(error){e.message=error.message||'저장하지 못했습니다. 입력값은 유지됩니다.'}
      finally{e.busy=false;if(user===scope())onChange()}
    }
    q('#budgetSave').addEventListener('click',save);
    q('#budgetReload').addEventListener('click',()=>void load(activeMonth,true));
    q('#budgetOpen').addEventListener('click',()=>{q('#financeBudgetPanel').open=true;q('#financeBudgetPanel').scrollIntoView({block:'start'});q('#budgetSave').focus()});
    return{render,load,invalidate(){entries.clear()}};
  }
  global.HaruBudgetUI={create};
})(window);
