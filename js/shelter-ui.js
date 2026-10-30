'use strict';
/* 하루 쉼터: 1 to 25 game, weekly leaderboard, and title metadata. */
(function(global){
  // Keep these thresholds aligned with supabase/step26_shelter_1to25.sql.
  const SCORE_LIMITS=Object.freeze({master:10000,diamond:13000,gold:17000,silver:22000});
  const TITLES=Object.freeze({
    weekly_1st:{label:'번개의 호흡',condition:'주간 1위',tone:'gold'},weekly_2nd:{label:'질주의 달인',condition:'주간 2위',tone:'silver'},weekly_3rd:{label:'찰나의 마스터',condition:'주간 3위',tone:'bronze'},weekly_top10:{label:'쉼터 랭커',condition:'주간 4~10위',tone:'ranker'},
    master:{label:'신의 손가락',condition:'10.00초 미만'},diamond:{label:'눈보다 빠른 손',condition:'13.00초 미만'},gold:{label:'경쾌한 리듬',condition:'17.00초 미만'},silver:{label:'침착한 집중',condition:'22.00초 미만'},bronze:{label:'쉼터 탐험가',condition:'1회 완주'},regular:{label:'쉼터 단골손님',condition:'누적 50회 완주'}
  });
  const TITLE_ORDER=['weekly_1st','weekly_2nd','weekly_3rd','weekly_top10','master','diamond','gold','silver','bronze','regular'];
  const $=selector=>document.querySelector(selector),esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let initialized=false,profile=null,board=null,running=false,expected=1,startAt=0,raf=0,countdownToken=0;

  function safeTitle(value){return value&&TITLES[value]?value:null}
  function titleLabel(value){return TITLES[safeTitle(value)]?.label||''}
  function titleBadge(value){const code=safeTitle(value),meta=TITLES[code];return meta?`<span class="title-badge title-${meta.tone||code}" data-title-code="${code}">${esc(meta.label)}</span>`:''}
  function formatMs(value){if(value===null||value===undefined||!Number.isFinite(Number(value)))return '--.--초';return `${(Number(value)/1000).toFixed(2).padStart(5,'0')}초`}
  function gradeFor(ms){return ms<SCORE_LIMITS.master?'master':ms<SCORE_LIMITS.diamond?'diamond':ms<SCORE_LIMITS.gold?'gold':ms<SCORE_LIMITS.silver?'silver':'bronze'}
  function shuffle(values,random=Math.random){const result=[...values];for(let index=result.length-1;index>0;index--){const pick=Math.floor(random()*(index+1));[result[index],result[pick]]=[result[pick],result[index]]}return result}
  function avatar(row){const Frame=global.HaruAvatarFrame,Storage=global.LabStorage,tier=Frame.safeTier(row.avatar_frame_tier),color=Frame.safeColor(row.avatar_frame_color,tier),crown=['crown','blossom'].includes(tier)?Frame.safeCrownColor(row.avatar_crown_color):'',path=row.avatar_path?Storage.publicUrl(row.avatar_path):'';return `<div class="avatar shelter-avatar" data-frame-tier="${tier}" data-frame-color="${color}" data-frame-crown-color="${crown}"><span class="avatar-face"><span class="avatar-letter">${esc(String(row.display_name||'하').slice(0,1))}</span>${path?`<img class="avatar-photo" src="${esc(path)}" alt="">`:''}</span>${Frame.art(tier)}</div>`}
  function renderLobby(){
    if(!board)return;
    $('#shelterBest').textContent=formatMs(board.my_best_ms);$('#shelterRank').textContent=board.my_rank?`전체 ${board.total_players}명 중 ${board.my_rank}등`:`이번 주 미참여 · 전체 ${board.total_players}명`;
    $('#shelterActiveTitle').innerHTML=profile?.active_title?titleBadge(profile.active_title):'<span class="title-badge title-none">장착 칭호 없음</span>';
    const rows=Array.isArray(board.top10)?board.top10:[];$('#shelterLeaderboard').innerHTML=rows.length?rows.map(row=>`<div class="shelter-rank-row"><strong class="shelter-rank-number">${row.rank}</strong>${avatar(row)}<div class="shelter-rank-person"><b>${esc(row.display_name||row.lab_name||'사용자')}</b>${titleBadge(row.active_title)}</div><time>${formatMs(row.best_ms)}</time></div>`).join(''):'<div class="shelter-empty">이번 주 첫 기록의 주인공이 되어보세요.</div>';
  }
  async function load(){board=await global.LabDB.shelterLeaderboard();renderLobby();return board}
  function show(view){for(const id of ['shelterLobby','shelterGame','shelterResult'])$(`#${id}`).classList.toggle('hidden',id!==view)}
  function renderTiles(){expected=1;$('#shelterNext').textContent='1';$('#shelterTimer').textContent='00.00초';$('#shelterGrid').innerHTML=shuffle(Array.from({length:25},(_,index)=>index+1)).map(number=>`<button type="button" class="shelter-tile" data-shelter-number="${number}" aria-label="숫자 ${number}">${number}</button>`).join('')}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  async function start(){
    if(running)return;const token=++countdownToken;show('shelterGame');renderTiles();$('#shelterCountdown').classList.remove('hidden');
    for(const word of ['3','2','1','START!']){if(token!==countdownToken)return;$('#shelterCountdown').textContent=word;await wait(word==='START!'?380:560)}
    if(token!==countdownToken)return;$('#shelterCountdown').classList.add('hidden');running=true;startAt=performance.now();tick();
  }
  function tick(){if(!running)return;$('#shelterTimer').textContent=formatMs(Math.floor((performance.now()-startAt)/10)*10);raf=requestAnimationFrame(tick)}
  function wrong(tile){tile.classList.remove('wrong');void tile.offsetWidth;tile.classList.add('wrong');setTimeout(()=>tile.classList.remove('wrong'),320)}
  async function choose(tile){
    if(!running||tile.classList.contains('cleared'))return;const number=Number(tile.dataset.shelterNumber);if(number!==expected){wrong(tile);return}
    tile.classList.add('cleared');tile.disabled=true;expected++;
    if(expected<=25){$('#shelterNext').textContent=String(expected);return}
    const elapsed=Math.round(performance.now()-startAt);running=false;cancelAnimationFrame(raf);$('#shelterTimer').textContent=formatMs(elapsed);await finish(elapsed);
  }
  async function finish(elapsed){
    $('#shelterCountdown').textContent='기록 저장 중…';$('#shelterCountdown').classList.remove('hidden');
    try{
      const result=await global.LabDB.recordShelter(elapsed);board=await global.LabDB.shelterLeaderboard();profile=await global.LabDB.ensureProfile();global.dispatchEvent(new CustomEvent('haru:profile-refresh',{detail:profile}));
      const grade=gradeFor(elapsed),newTitles=Array.isArray(result.new_titles)?result.new_titles:[];
      $('#shelterResultTime').textContent=formatMs(elapsed);$('#shelterResultGrade').textContent=TITLES[grade].label;$('#shelterResultRank').textContent=`전체 ${result.total_players}명 중 ${result.my_rank}등`;
      $('#shelterNewTitles').innerHTML=newTitles.length?`<p>새 칭호 획득</p><div>${newTitles.map(titleBadge).join('')}</div>`:'<p>이번 도전에서 새로 획득한 칭호는 없습니다.</p>';
      renderLobby();show('shelterResult');
    }catch(error){console.error(error);$('#shelterCountdown').textContent=error.message||'기록을 저장하지 못했습니다.';setTimeout(()=>$('#shelterCountdown').classList.add('hidden'),1800)}
  }
  function cancelGame(){running=false;cancelAnimationFrame(raf);countdownToken++;show('shelterLobby');renderLobby()}
  function renderTitleOptions(available,selected){const owned=new Set(Array.isArray(available)?available:[]),active=safeTitle(selected);return `<button type="button" class="title-option" data-title-choice="" aria-pressed="${!active}"><span class="title-badge title-none">없음</span><small>칭호를 표시하지 않습니다.</small></button>`+TITLE_ORDER.map(code=>{const meta=TITLES[code],enabled=owned.has(code);return `<button type="button" class="title-option ${enabled?'':'locked'}" data-title-choice="${code}" aria-pressed="${active===code}" ${enabled?'':'disabled'}>${titleBadge(code)}<small>${enabled?'획득 완료':`획득 조건 · ${esc(meta.condition)}`}</small></button>`}).join('')}
  function init(){
    if(initialized)return;initialized=true;
    $('#shelterStart').addEventListener('click',start);$('#shelterRetry').addEventListener('click',start);$('#shelterBack').addEventListener('click',cancelGame);$('#shelterGameBack').addEventListener('click',cancelGame);
    $('#shelterGrid').addEventListener('click',event=>{const tile=event.target.closest('[data-shelter-number]');if(tile)void choose(tile)});
  }
  async function open(currentProfile){init();profile=currentProfile||profile;cancelGame();await load()}
  global.HaruShelterUI={SCORE_LIMITS,TITLES,TITLE_ORDER,safeTitle,titleLabel,titleBadge,formatMs,gradeFor,shuffle,renderTitleOptions,open,load};
})(window);
