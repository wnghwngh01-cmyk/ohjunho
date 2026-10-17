/* Private monthly budgets. Loading and unsaved drafts are scoped to user + month. */
(function(global){
  'use strict';
  function create({db,finance,root=document,onChange=()=>{}}){
    const entries=new Map();let owner='',activeMonth='',activeRows=[],activeCategories=[];
    const q=s=>root.querySelector(s),money=n=>`${n<0?'-':''}₩${Math.abs(n).toLocaleString('ko-KR')}`;
    function scope(){const id=db.user()?.id||'';if(owner!==id){entries.clear();owner=id}return id}
    function entry(month){scope();if(!entries.has(month))entries.set(month,{phase:'idle',draft:null,data:null,busy:false,message:'',request:0,selected:''});return entries.get(month)}
    async function load(month,force=false){
      const user=scope(),e=entry(month);if(e.phase==='loading'||(!force&&e.phase==='ready'))return;
      const request=++e.request;e.phase='loading';onChange();
      try{const data=await db.getMonthBudget(month);if(user!==scope()||request!==e.request)return;e.data=data;e.phase='ready';e.message='';}
      catch(error){if(user!==scope()||request!==e.request)return;e.phase='error';e.message=error.message||'예산을 불러오지 못했습니다.';}
      onChange();
    }
    function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
    function render(month,rows,categories){
      activeMonth=month;activeRows=rows;activeCategories=categories;
      const e=entry(month),host=q('#budgetRows'),summary=q('#budgetSummary'),status=q('#budgetStatus');
      q('#financeBudgetLabel').textContent=`${month===db.today().slice(0,7)?'이번 달':month.replace('-','년 ')+'월'} 남은 예산`;
      host.replaceChildren();status.textContent=e.message;
      q('#budgetSave').disabled=e.phase!=='ready'||e.busy||!e.selected;
      q('#budgetReload').disabled=e.phase==='loading'||e.busy;
      q('#budgetCategory').disabled=e.phase!=='ready'||e.busy;
      q('#budgetAmount').disabled=e.busy;
      q('#budgetSave').textContent=e.busy?'저장 중…':'이 분류 예산 저장';
      if(e.phase!=='ready'){
        q('#financeBudgetRemaining').classList.toggle('budget-over',false);
        summary.textContent='월별 예산';q('#financeBudgetRemaining').textContent=e.phase==='error'?'조회 실패':'불러오는 중';
        q('#budgetUnassigned').textContent='';q('#budgetHint').textContent=e.phase==='error'?'예산 설정·수정을 펼쳐 다시 불러오기를 눌러 주세요. 입력 중인 값은 유지됩니다.':'저장된 예산을 확인하고 있습니다.';
        q('#budgetSelected').hidden=true;
        if(e.phase==='idle')void load(month);return;
      }
      const stats=finance.budgetSummary(rows,month,e.data.items);
      const remaining=q('#financeBudgetRemaining');remaining.textContent=stats.configured?(stats.remaining<0?`${money(-stats.remaining)} 초과`:money(stats.remaining)):'예산 설정하기';
      remaining.classList.toggle('budget-over',stats.remaining<0);
      summary.textContent=`월별 예산 · ${stats.configured?money(stats.budget)+' 설정':'미설정'}`;
      q('#budgetHint').textContent=e.data.status==='inherited'?`${e.data.source_month.slice(0,7)} 예산을 이어받을 예정입니다. 미래 월은 저장 전까지 미리보기입니다.`:e.data.status==='none'?'아직 이 달의 예산이 없습니다.':`${month} 저장된 예산입니다.`;
      if(e.draft&&Object.keys(e.draft).length)q('#budgetHint').textContent+=' 입력 중인 값은 저장하기 전까지 아래 사용 현황에 반영되지 않습니다.';
      q('#budgetUnassigned').textContent=stats.unbudgeted?`예산 미설정 분류 지출 ${money(stats.unbudgeted)}`:'';
      if(!stats.configured)host.append(node('p','설정된 예산이 없습니다. 아래에서 지출 분류를 골라 추가해 주세요.','budget-empty'));
      stats.categories.forEach(item=>{
        const row=node('div',undefined,'budget-row'),head=node('div',undefined,'budget-row-head');
        const label=node('strong',item.category),value=node('span',`${money(item.used)} / ${money(item.budget)}`);
        const meter=node('div',undefined,'budget-meter'),fill=node('span',undefined,'budget-meter-fill');
        const bottom=node('div',undefined,'budget-row-bottom');
        const over=item.remaining<0;
        row.classList.toggle('budget-over',over);
        meter.classList.toggle('budget-over',over);
        fill.style.width=`${item.percent}%`;
        meter.setAttribute('role','img');
        meter.setAttribute('aria-label',`${item.category} 예산 ${money(item.budget)} 중 ${money(item.used)} 사용${over?`, ${money(-item.remaining)} 초과`:`, ${money(item.remaining)} 남음`}`);
        head.append(label,value);
        bottom.append(node('span',over?`${money(-item.remaining)} 초과`:`${money(item.remaining)} 남음`),node('span',item.budget?`${Math.round(item.used/item.budget*100)}% 사용`:item.used?'예산 초과':'0% 사용'));
        meter.append(fill);row.append(head,meter,bottom);host.append(row);
      });
      const all=[...new Set([...categories,...Object.keys(e.data.items)])];
      const select=q('#budgetCategory');select.replaceChildren(node('option','분류 선택'));
      select.children[0].value='';
      all.forEach(category=>{const option=node('option',category);option.value=category;select.append(option)});
      if(!all.includes(e.selected))e.selected='';
      q('#budgetSave').disabled=e.busy||!e.selected;
      select.value=e.selected;
      const selected=q('#budgetSelected'),input=q('#budgetAmount');selected.hidden=!e.selected;
      if(!e.selected)input.value='';
      if(e.selected){
        const item=stats.categories.find(x=>x.category===e.selected);
        const used=rows.filter(x=>x.tx_type==='expense'&&x.tx_date?.startsWith(month)&&(x.category||'기타')===e.selected).reduce((s,x)=>s+Number(x.amount),0);
        q('#budgetSelectedUsage').textContent=item?`현재 예산 ${money(item.budget)} · 사용 ${money(item.used)} · ${item.remaining<0?money(-item.remaining)+' 초과':money(item.remaining)+' 남음'}`:`현재 예산 미설정 · 사용 ${money(used)}`;
        input.value=e.draft&&Object.hasOwn(e.draft,e.selected)?e.draft[e.selected]:item?Number(item.budget).toLocaleString('ko-KR'):'';
        input.setAttribute('aria-label',`${e.selected} 월 예산 (원)`);
      }
    }
    async function save(){
      const month=activeMonth,user=scope(),e=entry(month),category=e.selected;
      if(e.phase!=='ready'||e.busy||!category)return;
      const items={...e.data.items};
      try{const amount=finance.parseBudget(q('#budgetAmount').value);if(amount===null)delete items[category];else items[category]=amount}
      catch(error){e.message=error.message;q('#budgetStatus').textContent=e.message;return}
      e.busy=true;onChange();
      try{
        const data=await db.saveMonthBudget(month,items,e.data.revision);if(user!==scope())return;
        e.data=data;if(e.draft){delete e.draft[category];if(!Object.keys(e.draft).length)e.draft=null}
        e.message=`${month} ${category} 예산을 저장했습니다.`;
        // A save can seal other elapsed months; invalidate their server revision.
        for(const [key,value] of entries)if(key!==month){value.request++;value.phase='idle'}
      }catch(error){e.message=error.message||'저장하지 못했습니다. 입력값은 유지됩니다.'}
      finally{e.busy=false;if(user===scope())onChange()}
    }
    q('#budgetCategory').addEventListener('change',event=>{const e=entry(activeMonth);e.selected=event.currentTarget.value;render(activeMonth,activeRows,activeCategories)});
    q('#budgetAmount').addEventListener('input',event=>{const e=entry(activeMonth);if(!e.selected)return;if(!e.draft)e.draft={};e.draft[e.selected]=event.currentTarget.value;e.message='저장하지 않은 변경사항이 있습니다.';q('#budgetStatus').textContent=e.message});
    q('#budgetSave').addEventListener('click',save);
    q('#budgetReload').addEventListener('click',()=>void load(activeMonth,true));
    q('#budgetOpen').addEventListener('click',()=>{q('#financeBudgetPanel').open=true;q('#financeBudgetPanel').scrollIntoView({block:'start'});q('#budgetSummary').focus()});
    return{render,load,invalidate(){entries.clear()}};
  }
  global.HaruBudgetUI={create};
})(window);
