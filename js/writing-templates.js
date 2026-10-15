(function(global){
  'use strict';
  const templates={free:'',day:'오늘 있었던 일\n\n느낀 점\n\n내일 하고 싶은 일',gratitude:'고마웠던 일\n\n이유',thought:'떠오른 생각\n\n그 이유\n\n다음 행동'};
  function append(body,key,limit=12000){
    if(!Object.hasOwn(templates,key))throw new Error('양식을 다시 선택해 주세요.');
    const text=templates[key];
    if(!text)return{body,changed:false,message:'기존 내용을 유지하고 자유롭게 작성합니다.'};
    if(body.includes(text))return{body,changed:false,message:'이미 본문에 있는 양식입니다.'};
    const next=body+(body?'\n\n':'')+text;
    if(next.length>limit)throw new Error(`본문은 최대 ${limit.toLocaleString('ko-KR')}자입니다. 내용을 줄인 뒤 양식을 추가해 주세요.`);
    return{body:next,changed:true,message:'양식을 추가했습니다. 내용을 자유롭게 수정하세요.'};
  }
  function bind({body,button,panel,hint,notify}){
    const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false')};
    button.addEventListener('click',()=>{const open=panel.hidden;panel.hidden=!open;button.setAttribute('aria-expanded',String(open));hint.textContent=body.value?'선택한 양식을 본문 아래에 추가합니다.':'선택한 양식을 본문에 넣습니다.'});
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){close();button.focus()}});
    panel.querySelectorAll('[data-writing-template]').forEach(choice=>choice.addEventListener('click',()=>{
      if(panel.hidden)return; // Ignore a queued double click after the first selection.
      close();
      try{const result=append(body.value,choice.dataset.writingTemplate,body.maxLength>0?body.maxLength:12000);
        if(result.changed){body.value=result.body;body.dispatchEvent(new Event('input',{bubbles:true}))}
        notify(result.message);body.focus();body.setSelectionRange(body.value.length,body.value.length);
      }catch(error){notify(error.message);button.focus()}
    }));
    return close;
  }
  global.HaruWritingTemplates={append,bind};
})(typeof window!=='undefined'?window:globalThis);
