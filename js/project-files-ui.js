(function(){
  function mount(){
    document.getElementById('projectProgress')?.closest('.field')?.classList.add('hidden');
    document.getElementById('pdProgress')?.closest('.field')?.classList.add('hidden');
    const save=document.getElementById('projectDetailSave');
    if(!save||document.getElementById('projectProcessFiles'))return;
    const label=document.createElement('label');
    label.className='photo-picker';
    label.textContent='과정 파일 추가 · 파일당 최대 20MB';
    const input=document.createElement('input');
    input.id='projectProcessFiles'; input.type='file'; input.multiple=true;
    input.accept='image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.hwp,.hwpx';
    label.appendChild(input); save.parentElement.before(label);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
})();
