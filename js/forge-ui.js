'use strict';
(function(global){
  const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let state=null,initialized=false,busy=false,audioContext=null;
  const outcomeCopy={success:'강화 성공',stay:'단계 유지',downgrade:'단계 하락',destroy:'검 파괴',protected_destroy:'보호권 방어'};

  function tierFor(level){const value=Number(level)||0;return value>=30?30:value>=25?25:value>=20?20:value>=15?15:value>=10?10:value>=5?5:0}
  function auraFor(level){const value=Number(level)||0;return value>=30?'aura-mythic':value>=25?'aura-gold':value>=20?'aura-purple':value>=15?'aura-blue':'aura-none'}
  function goldenHit(needleRect,zoneRect){const center=Number(needleRect?.left||0)+Number(needleRect?.width||0)/2;return center>=Number(zoneRect?.left||0)&&center<=Number(zoneRect?.right||0)}
  function dateTime(value){if(!value)return '';return new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}
  function setBusy(on){busy=on;const button=$('#forgeEnhance');if(button){button.disabled=on||Number(state?.sword?.sword_level)>=30;button.textContent=on?'강화 중…':Number(state?.sword?.sword_level)>=30?'신화 등급 완성':'🔨 강화하기'}}
  function primeAudio(){try{audioContext=audioContext||new (global.AudioContext||global.webkitAudioContext)();audioContext.resume?.()}catch{}}

  function sound(kind){
    try{
      primeAudio();
      const now=audioContext.currentTime,master=audioContext.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.12,now+.01);master.gain.exponentialRampToValueAtTime(.0001,now+(kind==='success'?.65:.35));master.connect(audioContext.destination);
      const notes=kind==='success'?[440,659,880]:kind==='destroy'?[180,116,72]:kind==='fail'?[180,145]:[260];
      notes.forEach((frequency,index)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type=kind==='destroy'?'sawtooth':kind==='success'?'sine':'square';oscillator.frequency.setValueAtTime(frequency,now+index*.08);gain.gain.setValueAtTime(index?0:.75,now+index*.08);gain.gain.linearRampToValueAtTime(.55,now+index*.08+.01);gain.gain.exponentialRampToValueAtTime(.001,now+index*.08+.2);oscillator.connect(gain);gain.connect(master);oscillator.start(now+index*.08);oscillator.stop(now+index*.08+.22)})
    }catch{}
  }
  function vibrate(kind){try{navigator.vibrate?.(kind==='destroy'?[80,45,140,45,180]:kind==='success'?[35,25,70]:kind==='fail'?[65]:[30])}catch{}}

  function renderHistory(rows=[]){
    const host=$('#forgeHistory');if(!host)return;
    host.innerHTML=rows.length?rows.map(row=>{const icon=row.outcome==='success'?'✨':row.outcome==='destroy'?'💥':row.outcome==='protected_destroy'?'🛡️':row.outcome==='downgrade'?'↘️':'➖';return `<article class="forge-list-item"><span>${icon}</span><div class="forge-list-copy"><strong>+${row.level_before} → +${row.level_after} · ${outcomeCopy[row.outcome]||row.outcome}</strong><small>성공 ${Number(row.success_rate)}% · 파괴 ${Number(row.destroy_rate)}%${row.bellows_bonus?' · 풀무질 +2%':''}${row.used_whetstone?' · 숫돌 +2%':''}</small></div><time>${esc(dateTime(row.created_at))}</time></article>`}).join(''):'<div class="empty">아직 강화 기록이 없습니다.</div>';
  }
  function renderGraveyard(rows=[]){
    const host=$('#forgeGraveyard');if(!host)return;
    host.innerHTML=rows.length?rows.map(row=>`<article class="forge-list-item"><span>🪦</span><div class="forge-list-copy"><strong>+${row.sword_level} ${esc(row.custom_name||row.sword_name)}</strong><small>${esc(row.author_name)} · ${esc(row.rip_message||'명검의 묘지에 잠들었습니다.')}${row.publication_id?` · 조의 ${Number(row.rip_count)||0}`:''}</small></div><time>${esc(dateTime(row.created_at))}</time></article>`).join(''):'<div class="empty">아직 명검의 묘지에 잠든 검이 없습니다.</div>';
  }
  function renderStats(stats={}){
    const host=$('#forgeStats');if(!host)return;
    host.innerHTML=`<div class="forge-stat"><span>전체 강화 시도</span><strong>${Number(stats.total_enhances||0).toLocaleString('ko-KR')}회</strong></div><div class="forge-stat"><span>전체 파괴</span><strong>${Number(stats.total_destructions||0).toLocaleString('ko-KR')}회</strong></div><div class="forge-stat"><span>최고 도달 단계</span><strong>+${Number(stats.highest_level||0)}강</strong></div><div class="forge-stat"><span>신화 검 탄생</span><strong>${Number(stats.mythic_created_count||0).toLocaleString('ko-KR')}자루</strong></div>`;
  }
  function render(){
    if(!state?.sword)return;const sword=state.sword,level=Number(sword.sword_level)||0,rates=state.rates;
    $('#forgeLevel').textContent=`+${level}강`;$('#forgeSwordName').textContent=sword.custom_name||sword.sword_name;$('#forgeCustomName').value=sword.custom_name||'';
    $('#forgeShards').textContent=Number(sword.shards||0).toLocaleString('ko-KR');$('#forgeWhetstones').textContent=Number(sword.whetstones||0).toLocaleString('ko-KR');$('#forgeShields').textContent=Number(sword.shields||0).toLocaleString('ko-KR');
    $('#forgeSuccessRate').textContent=level>=30?'완성':`${Number(rates?.success||0)}%`;$('#forgeDestroyRate').textContent=level>=30?'0%':`${Number(rates?.destroy||0)}%`;
    $('#forgeShieldCopy').textContent=`보유 ${Number(sword.shields||0)}장`;$('#forgeWhetstoneCopy').textContent=`+2% · 보유 ${Number(sword.whetstones||0)}개`;
    const shield=$('#forgeUseShield'),whetstone=$('#forgeUseWhetstone');shield.disabled=!Number(sword.shields);whetstone.disabled=!Number(sword.whetstones);if(shield.disabled)shield.checked=false;if(whetstone.disabled)whetstone.checked=false;
    $('#forgeShareEvents').checked=!!sword.share_events;const swordArt=$('#forgeSwordArt');swordArt.className=`forge-sword-art tier-${tierFor(level)}`;$('#forgeAura').className=`forge-aura ${auraFor(level)}`;
    renderHistory(state.history);renderGraveyard(state.graveyard);renderStats(state.stats);setBusy(false);
  }
  function resultMessage(result){
    const name=state?.sword?.custom_name||state?.sword?.sword_name||'검';if(!result)return '';
    if(result.outcome==='success')return `✨ 강화 성공! ${name}이(가) +${result.level_after}강이 되었습니다.`;
    if(result.outcome==='protected_destroy')return `🛡️ 보호권이 검의 파괴를 막아냈습니다! (+${result.level_after}강)`;
    if(result.outcome==='destroy')return `💥 검이 파괴되었습니다. 검의 파편 ${result.shards_gained}개를 획득했습니다.`;
    if(result.outcome==='downgrade')return `강화에 실패해 +${result.level_after}강으로 하락했습니다.`;
    return `강화에 실패했지만 +${result.level_after}강을 유지했습니다.`;
  }
  function animateResult(result){
    const card=$('.forge-main-card'),message=$('#forgeResultMessage'),button=$('#forgeEnhance');card.classList.remove('result-success','result-destroy');message.classList.remove('destroy','fail');void card.offsetWidth;
    button.classList.add('hit');setTimeout(()=>button.classList.remove('hit'),450);
    if(result.outcome==='success'){card.classList.add('result-success');sound('success');vibrate('success')}
    else if(result.outcome==='destroy'){card.classList.add('result-destroy');message.classList.add('destroy');sound('destroy');vibrate('destroy')}
    else{message.classList.add('fail');sound('fail');vibrate('fail')}
    message.textContent=resultMessage(result);setTimeout(()=>card.classList.remove('result-success','result-destroy'),800);
  }
  async function enhance(bellowsBonus=false){
    if(busy)return;setBusy(true);
    try{const response=await global.LabDB.attemptForge({useWhetstone:$('#forgeUseWhetstone').checked,useShield:$('#forgeUseShield').checked,bellowsBonus});state=response;render();animateResult(response.result)}
    catch(error){$('#forgeResultMessage').textContent=error?.message||'강화를 완료하지 못했습니다.';$('#forgeResultMessage').className='forge-result-message fail';setBusy(false)}
  }
  function startEnhance(){if(busy||Number(state?.sword?.sword_level)>=30)return;primeAudio();if($('#forgeSkipBellows').checked){enhance(false);return}$('#forgeBellows').classList.remove('hidden');$('#forgeBellowsStop').focus()}
  function closeBellows(){ $('#forgeBellows').classList.add('hidden') }
  function stopBellows(){const bonus=goldenHit($('#forgeGaugeNeedle').getBoundingClientRect(),$('.forge-golden-zone').getBoundingClientRect());closeBellows();enhance(bonus)}
  async function savePreferences(){
    const name=$('#forgeCustomName').value.trim(),share=$('#forgeShareEvents').checked;
    try{state=await global.LabDB.updateForgePreferences(name,share);render();$('#forgeRenameForm').classList.add('hidden');$('#forgeResultMessage').textContent=name?'검 이름을 저장했습니다.':'기본 검 이름을 사용합니다.'}
    catch(error){$('#forgeResultMessage').textContent=error?.message||'대장간 설정을 저장하지 못했습니다.'}
  }
  async function exchange(item){
    if(busy)return;setBusy(true);try{state=await global.LabDB.exchangeForgeItem(item);render();$('#forgeResultMessage').textContent=item==='whetstone'?'숫돌 1개를 교환했습니다.':'파괴 방어권 1장을 교환했습니다.'}catch(error){$('#forgeResultMessage').textContent=error?.message||'교환하지 못했습니다.';setBusy(false)}
  }
  function switchTab(name){$$('[data-forge-tab]').forEach(button=>button.classList.toggle('active',button.dataset.forgeTab===name));$$('[data-forge-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.forgePane===name))}
  function init(){
    if(initialized)return;initialized=true;
    $('#forgeEnhance').addEventListener('click',startEnhance);$('#forgeBellowsStop').addEventListener('click',stopBellows);$('#forgeBellowsCancel').addEventListener('click',closeBellows);
    $('#forgeRenameOpen').addEventListener('click',()=>{$('#forgeRenameForm').classList.remove('hidden');$('#forgeCustomName').focus()});$('#forgeRenameCancel').addEventListener('click',()=>$('#forgeRenameForm').classList.add('hidden'));$('#forgeRenameForm').addEventListener('submit',event=>{event.preventDefault();savePreferences()});
    $('#forgeShareEvents').addEventListener('change',savePreferences);$$('[data-forge-buy]').forEach(button=>button.addEventListener('click',()=>exchange(button.dataset.forgeBuy)));$$('[data-forge-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.forgeTab)));
  }
  async function open(){init();setBusy(true);$('#forgeResultMessage').textContent='대장간 상태를 불러오는 중…';try{state=await global.LabDB.getForgeState();render();$('#forgeResultMessage').textContent=Number(state.sword.sword_level)>=30?'신화의 검이 완성되었습니다.':'망치를 들고 강화를 시작해 보세요.'}catch(error){$('#forgeResultMessage').textContent=error?.message||'대장간을 불러오지 못했습니다.';setBusy(false)}}

  global.HaruForgeUI={open,tierFor,auraFor,goldenHit,outcomeCopy};
})(window);
