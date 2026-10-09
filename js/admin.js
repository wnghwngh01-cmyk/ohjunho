'use strict';
(() => {
  const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cfg=window.LAB_CONFIG;
  if(!window.supabase){$('#notice').textContent='연결 모듈을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.';return;}
  // Separate storage key: operator login must not replace the consumer app's session.
  const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{storageKey:'haru-operator-auth',storage:sessionStorage,persistSession:true,detectSessionInUrl:false}});
  const menus={dashboard:['운영 현황','접수된 요청과 이용 현황을 확인하세요.'],bugs:['버그 제보','사용자가 겪은 불편을 확인하고 답변하세요.'],contacts:['운영자 문의','사용자의 문의를 확인하고 답변하세요.'],reports:['신고','신고 내용과 해당 사용자의 활동을 함께 살펴보세요.'],posts:['공유한 글','광장에 공유한 기록·일기·독서록·자유글입니다.'],comments:['댓글','댓글과 답글을 확인하고 관리하세요.'],users:['사용자','계정과 공개 활동, 이용 제한 이력을 확인하세요.'],restrictions:['광장 이용 제한','제한 기간과 사유를 확인하고 해제할 수 있습니다.'],ideas:['개선 제안','이용자의 제안을 살펴보고 처리 상태를 남기세요.'],security:['보안 제보','비공개로 접수된 보안 제보입니다.'],messages:['알림 발송','개인 안내와 전체 공지를 사용자 알림함에 보냅니다.'],errors:['오류 기록','앱에서 수집한 오류를 확인하세요.'],audit:['운영 기록','운영 조치와 열람 이력이 남습니다.']};
  const statuses={open:'접수',reviewing:'확인 중',planned:'수정 예정',resolved:'해결',dismissed:'종결'};
  const table={posts:'publications',comments:'publication_comments',ideas:'feature_requests',legacy_bugs:'feature_requests'};
  let section='dashboard',offset=0,rows=[],factor=null,generation=0,authorized=false,queueRows=[];
  const date=v=>v?(v==='infinity'?'해제 전까지':new Date(v).toLocaleString('ko-KR')):'—';
  function notice(message,error=false){$('#notice').textContent=message;$('#notice').classList.toggle('error',error);if($('#detail').open)$('#dialogNotice').textContent=error?message:'';}
  async function rpc(name,args){const {data,error}=await db.rpc(name,args);if(error)throw new Error(error.message);return data;}
  async function busy(button,fn){button.disabled=true;try{await fn();}catch(e){notice(e.message||'요청에 실패했습니다. 다시 시도해 주세요.',true);}finally{button.disabled=false;}}
  function clear(){authorized=false;generation++;rows=[];$('#workspace').hidden=true;$('#content').replaceChildren();$('#detail').close();$('#detailBody').replaceChildren();$('#auth').hidden=false;$('#nav').replaceChildren();$('#qr').replaceChildren();$('#otp').value='';}
  async function checkAccess(){
    const {data:{session}}=await db.auth.getSession();
    if(!session){clear();$('#loginForm').hidden=false;$('#mfaForm').hidden=true;return;}
    $('#logout').hidden=false;
    const access=await rpc('operator_access');
    if(!access.operator){clear();notice('운영자로 등록되지 않은 계정입니다.',true);return;}
    if(!access.verified){
      $('#loginForm').hidden=true;$('#mfaForm').hidden=false;
      const {data,error}=await db.auth.mfa.listFactors();if(error)throw error;
      factor=data.totp.find(x=>x.status==='verified')?.id;
      if(!factor){
        for(const item of data.totp.filter(x=>x.status==='unverified')){const r=await db.auth.mfa.unenroll({factorId:item.id});if(r.error)throw r.error;}
        const {data:enrolled,error:e}=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'하루 운영실'});if(e)throw e;
        factor=enrolled.id;const img=document.createElement('img');img.alt='인증 앱 등록 QR 코드';img.src=enrolled.totp.qr_code;$('#qr').replaceChildren(img);$('#mfaHelp').textContent='인증 앱으로 QR 코드를 등록한 뒤 6자리 숫자를 입력하세요.';
      }
      return;
    }
    authorized=true;$('#auth').hidden=true;$('#workspace').hidden=false;$('#qr').replaceChildren();
    $('#nav').innerHTML=Object.entries(menus).map(([key,[label]])=>`<button data-section="${key}">${label}</button>`).join('');
    await load();
  }
  $('#loginForm').addEventListener('submit',e=>{e.preventDefault();busy(e.submitter,async()=>{const {error}=await db.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});$('#password').value='';if(error)throw error;await checkAccess();});});
  $('#mfaForm').addEventListener('submit',e=>{e.preventDefault();busy(e.submitter,async()=>{const {error}=await db.auth.mfa.challengeAndVerify({factorId:factor,code:$('#otp').value});$('#otp').value='';if(error)throw error;await checkAccess();});});
  $('#logout').onclick=()=>busy($('#logout'),async()=>{const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;clear();$('#logout').hidden=true;$('#loginForm').hidden=false;$('#mfaForm').hidden=true;notice('로그아웃했습니다.');});
  db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')clear();});
  $('#nav').onclick=e=>{const b=e.target.closest('[data-section]');if(!b)return;section=b.dataset.section;offset=0;$('#search').value='';$('#status').value='';load().catch(e=>notice(e.message,true));};
  $('#filters').onsubmit=e=>{e.preventDefault();offset=0;busy(e.submitter,load);};$('#refresh').onclick=()=>busy($('#refresh'),load);
  $('#prev').onclick=()=>{offset=Math.max(0,offset-50);load().catch(e=>notice(e.message,true));};$('#next').onclick=()=>{offset+=50;load().catch(e=>notice(e.message,true));};
  $('#closeDetail').onclick=()=>$('#detail').close();$('#detail').addEventListener('close',()=>$('#detailBody').replaceChildren());
  async function load(){
    if(!authorized)return;
    const ticket=++generation,current=section;
    $('#heading').textContent=menus[current][0];$('#description').textContent=menus[current][1];
    $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.section===current));
    $('#content').innerHTML='<div class="empty">불러오는 중…</div>';
    $('#filters').hidden=current==='dashboard';$('#status').disabled=!['reports','bugs','contacts','legacy_bugs','security','ideas'].includes(current);
    notice('');
    try{
      const queue=await rpc('operator_queue');
      if(ticket!==generation)return;
      for(const key of ['bugs','contacts','reports']){const button=$(`#nav [data-section="${key}"]`);if(button)button.textContent=menus[key][0]+(queue[key]?` · ${queue[key]}`:'');}
      queueRows=queue.recent||[];
      const filters={search:$('#search').value,status:$('#status').disabled?'':$('#status').value,offset};
      const data=current==='bugs'?await OperatorData.bugReports(rpc,filters):await rpc('operator_list',{p_kind:current,p_search:filters.search,p_status:filters.status,p_offset:offset});
      if(ticket!==generation)return;
      $('.pager').hidden=current==='dashboard';
      if(current==='dashboard'){
        const labels={users:'전체 사용자',posts:'공유한 글',tickets:'버그 제보 누적',contacts:'운영자 문의 누적',reports:'신고 누적',restrictions:'현재 광장 이용 제한'};
        $('#content').innerHTML=`<div class="metrics">${Object.entries(labels).map(([k,v])=>`<article class="metric"><p>${v}</p><strong>${Number(data[k]||0).toLocaleString()}</strong></article>`).join('')}</div><div class="panel section-gap"><h2>오늘 살펴볼 일</h2><p>새 버그 제보와 신고를 먼저 확인하고, 조치 이유와 사용자에게 보낼 안내를 남겨주세요.</p><p class="muted">계정 삭제는 되돌릴 수 없습니다. 개인 공간의 비공개 기록은 운영실에 표시하지 않습니다.</p></div><div class="panel section-gap"><h2>최근 미처리 제보·신고</h2>${queueRows.length?queueRows.map((r,i)=>`<button class="queue-item" data-case-index="${i}"><strong>${esc(r.title)}</strong><span>${r.kind==='reports'?'신고':r.kind==='contacts'?'운영자 문의':'버그 제보'} · ${esc(statuses[r.case_status])} · ${esc(date(r.created_at))}</span></button>`).join(''):'<p>미처리 제보와 신고가 없습니다.</p>'}</div>`;return;
      }
      rows=data.slice(0,50);$('#prev').disabled=offset===0;$('#next').disabled=data.length<=50;$('#page').textContent=`${offset/50+1} 페이지`;
      $('#content').innerHTML=(current==='messages'?'<button class="primary" id="compose">새 알림 작성</button><p class="muted">앱 내 알림함으로 전달됩니다. 휴대폰 푸시는 포함하지 않습니다.</p>':'')+(rows.length?rows.map((r,i)=>`<article class="item"><div><div class="muted">${esc(date(r.created_at||r.updated_at))} ${r.case_kind==='legacy_bugs'?'<span class="pill">이전 제보</span>':''} ${r.hidden?'<span class="pill">숨김</span>':''} ${['reports','bugs','contacts','legacy_bugs','security','ideas'].includes(current)&&r.case_status?`<span class="pill">${esc(statuses[r.case_status])}</span>`:''}</div><h3>${esc(r.title||r.display_name||r.action||r.context||r.reason||'내용 확인')}</h3><p class="preview">${esc(r.body||r.details||r.message||r.email||r.note||'')}</p><p class="mono">${esc(r.user_id||r.reporter_id||r.recipient_id||r.target||r.id)}</p></div><div class="actions"><button data-index="${i}">상세 보기</button></div></article>`).join(''):'<div class="panel empty">조건에 맞는 항목이 없습니다.</div>');
      $('#compose')?.addEventListener('click',()=>compose());
    }catch(e){if(ticket===generation){$('#content').innerHTML='<div class="panel empty">목록을 불러오지 못했습니다. 새로고침으로 다시 시도하세요.</div>';notice(e.message,true);}}
  }
  function $$(s){return [...document.querySelectorAll(s)];}
  const publicUrl=path=>db.storage.from(cfg.PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
  function gallery(r){const media=Array.isArray(r.meta?.public_media)?r.meta.public_media:[];const paths=media.map(x=>typeof x==='string'?x:x.storage_path||x.path).filter(Boolean);if(!paths.length&&r.cover_path)paths.push(r.cover_path);return paths.length?`<div class="gallery">${paths.map(p=>`<a href="${esc(publicUrl(p))}" target="_blank" rel="noopener noreferrer"><img src="${esc(publicUrl(p))}" alt="첨부 사진 크게 보기" loading="lazy"></a>`).join('')}</div>`:'';}
  $('#content').onclick=e=>{const q=e.target.closest('[data-case-index]');if(q){const r=queueRows[Number(q.dataset.caseIndex)];detail(r,r.kind);return;}const b=e.target.closest('[data-index]');if(b)detail(rows[Number(b.dataset.index)]);};
  function detail(r,current=r.case_kind||section){
    $('#dialogNotice').textContent='';
    $('#detailTitle').textContent=r.title||r.display_name||'상세 보기';
    $('#detailBody').innerHTML=`<p class="mono">ID ${esc(r.id||r.user_id)}</p><p class="muted">${esc(date(r.created_at||r.updated_at))}</p><div class="body-text">${esc(r.body||r.details||r.message||r.reason||'')}</div>${gallery(r)}${r.screen?`<p>발생 화면: ${esc(r.screen)} · 버전: ${esc(r.app_version)}</p>`:''}<p class="mono">사용자 ${esc(r.user_id||r.reporter_id||r.id||'')}</p>${r.target_id?`<p class="mono">신고 대상 ${esc(r.target_type)} / ${esc(r.target_id)}</p>`:''}${r.target_user_id?`<p class="mono">신고 대상 사용자 ${esc(r.target_user_id)}</p>`:''}${r.operator_note?`<p>운영 메모: ${esc(r.operator_note)}</p>`:''}<div class="actions" id="detailActions"></div>`;
    const actions=$('#detailActions');
    const add=(label,fn,danger=false)=>{const b=document.createElement('button');b.textContent=label;if(danger)b.className='danger';b.onclick=()=>busy(b,fn);actions.append(b);};
    if(table[current])add(r.hidden?'숨김 해제':'광장에서 숨기기',()=>actionForm(r.hidden?'restore':'hide',{id:r.id,kind:table[current]},'광장 표시 변경 · 원본과 기존 사진 링크는 보존됩니다.'));
    if(['reports','bugs','contacts','legacy_bugs','security','ideas'].includes(current)){add('처리 상태 변경',()=>caseForm(r,current));add('답변 및 답변 이력',()=>replyThread(r,current));}
    const uid=current==='users'?r.id:(r.user_id||r.reporter_id);
    if(uid&&['posts','comments','bugs','contacts','legacy_bugs','ideas','security'].includes(current))add('작성자 프로필',async()=>{
      const list=await rpc('operator_list',{p_kind:'users',p_search:uid,p_status:'',p_offset:0});
      if(!$('#detail').open)return;
      const user=list.find(x=>x.id===uid);if(!user)throw new Error('탈퇴했거나 찾을 수 없는 사용자입니다.');
      detail(user,'users');addProfileBack(()=>detail(r,current));
    });
    if(uid&&current!=='audit')add('개인 알림 보내기',()=>compose(uid));
    if(current==='users'||current==='restrictions'){
      const id=current==='users'?r.id:r.user_id;
      add('이 사용자의 공유 글',()=>jump('posts',id));add('이 사용자의 댓글',()=>jump('comments',id));
      add('광장 이용 제한',()=>restrictionForm(id),true);add('광장 제한 해제',()=>actionForm('unrestrict',{id},'제한 해제 사유'),false);
      add('사용자 운영 이력',()=>userHistory(r,current,id));add('계정 정지·삭제',()=>accountForm(id),true);
      $('#detailBody').insertAdjacentHTML('afterbegin',`<p><strong>${esc(r.display_name||'사용자')}</strong></p><p>${esc(r.lab_name||'')}</p><p>${esc(r.email||'')}</p><p>공유 글 ${Number(r.post_count||0)}개</p><p>광장 제한 종료: ${esc(date(r.restricted_until||r.until_at))}</p><p>계정 정지 종료: ${esc(date(r.banned_until))}</p>`);
    }
    if(r.target_user_id)add('신고된 사용자 확인',()=>jump('users',r.target_user_id));
    if(current==='reports')add('신고 당시 내용',async()=>{const snapshot=await rpc('operator_report_snapshot',{p_report:r.id});const div=document.createElement('div');div.className='body-text';div.textContent=snapshot?JSON.stringify(snapshot,null,2):'이전 신고는 당시 사본이 없습니다. 현재 게시물에서 확인하세요.';$('#detailBody').append(div);});
    if(current==='reports'&&r.target_id)add('신고된 내용 찾기',()=>jump(r.target_type?.includes('comment')?'comments':'posts',r.target_id));
    if(current==='audit')$('#detailBody').insertAdjacentHTML('beforeend',`<pre class="body-text">${esc(JSON.stringify(r.detail,null,2))}</pre>`);
    if(!$('#detail').open)$('#detail').showModal();
  }
  async function userHistory(user,origin,id,offset=0){
    const rows=await rpc('operator_user_history',{p_user:id,p_offset:offset});if(!$('#detail').open)return;
    const labels={hide:'글 숨김',restore:'숨김 해제',restrict:'광장 제한',unrestrict:'광장 제한 해제',account_ban:'계정 정지',account_permanent_ban:'계정 영구 제한',account_unban:'계정 정지 해제',account_delete:'계정 삭제',reply:'제보 답변',message:'개인 알림',case:'처리 상태 변경'};
    $('#detailTitle').textContent='사용자 운영 이력';$('#detailBody').innerHTML=`<p>${esc(user.display_name||'사용자')}</p><p class="mono">${esc(id)}</p><p class="muted">신고 접수만으로 위반이 확정되는 것은 아닙니다. 신고 내용과 조치 사유를 함께 확인하세요.</p>${rows.length?rows.slice(0,50).map(r=>`<article class="history-item"><small>${r.kind==='report'?'접수된 신고':r.kind==='message'?'전달한 안내':'운영 조치'} · ${esc(date(r.created_at))}</small><h3>${esc(labels[r.title]||r.title)}</h3><p class="body-text">${esc(r.body)}</p></article>`).join(''):'<p>운영 이력이 없습니다.</p>'}<div class="actions"><button id="historyBack">프로필로 돌아가기</button><button id="historyPrev" ${offset?'':'disabled'}>이전</button><button id="historyNext" ${rows.length>50?'':'disabled'}>다음</button></div>`;
    $('#historyBack').onclick=()=>detail(user,origin);$('#historyPrev').onclick=()=>busy($('#historyPrev'),()=>userHistory(user,origin,id,Math.max(0,offset-50)));$('#historyNext').onclick=()=>busy($('#historyNext'),()=>userHistory(user,origin,id,offset+50));
  }
  async function replyThread(r,kind,page=0){
    const replies=await rpc('operator_case_replies',{p_kind:kind,p_id:r.id,p_offset:page});
    if(!$('#detail').open)return;
    const request=crypto.randomUUID();
    form('제보 답변',`<h3>${esc(r.title||r.reason||'접수한 신고')}</h3><div class="body-text">${esc(r.body||r.details||'')}</div><h3>이전 답변</h3>${replies.length?replies.slice(0,50).map(x=>`<article><p class="muted">${esc(date(x.created_at))}</p><p class="body-text">${esc(x.body)}</p></article>`).join(''):'<p>아직 답변하지 않았습니다.</p>'}<div class="actions"><button type="button" id="replyPrev" ${page?'':'disabled'}>최근 답변</button><button type="button" id="replyNext" ${replies.length>50?'':'disabled'}>이전 답변</button></div><label>답변 내용<textarea name="body" maxlength="4000" required></textarea></label><p>제보 제목과 함께 작성자의 개인 알림함에 전달됩니다.</p><label><input type="checkbox" required> 제보 작성자에게 이 답변을 보내겠습니다.</label>`,async data=>{
      await rpc('operator_reply',{p_kind:kind,p_id:r.id,p_body:data.get('body'),p_request:request});
      await replyThread(r,kind);notice('답변을 보내고 이력에 남겼습니다.');
    });
    $('#replyPrev').onclick=()=>busy($('#replyPrev'),()=>replyThread(r,kind,Math.max(0,page-50)));
    $('#replyNext').onclick=()=>busy($('#replyNext'),()=>replyThread(r,kind,page+50));
  }
  function addProfileBack(back){const button=document.createElement('button');button.textContent='원래 글로 돌아가기';button.onclick=back;$('#detailActions').prepend(button);}
  async function jump(to,q){$('#detail').close();section=to;offset=0;$('#search').value=q;$('#status').value='';await load();}
  function form(title,fields,submit){$('#dialogNotice').textContent='';$('#detailTitle').textContent=title;$('#detailBody').innerHTML=`<form id="actionForm">${fields}<button class="primary" type="submit">확인하고 실행</button></form>`;$('#actionForm').onsubmit=e=>{e.preventDefault();busy(e.submitter,()=>submit(new FormData(e.target)));};if(!$('#detail').open)$('#detail').showModal();}
  const reasonField='<label>처리 사유<textarea name="reason" minlength="2" maxlength="2000" required></textarea></label>';
  async function perform(action,payload,request=crypto.randomUUID()){await rpc('operator_action',{p_action:action,p_payload:payload,p_request:request});$('#detail').close();await load();notice('처리하고 운영 기록에 남겼습니다.');}
  function actionForm(action,payload,title){const request=crypto.randomUUID();form(title,reasonField,data=>perform(action,{...payload,reason:data.get('reason')},request));}
  function caseForm(r,kind){const request=crypto.randomUUID();form('처리 상태 변경',`<label>상태<select name="status">${Object.entries(statuses).map(([k,v])=>`<option value="${k}" ${r.case_status===k?'selected':''}>${v}</option>`).join('')}</select></label>${reasonField}`,data=>perform('case',{id:r.id,kind,status:data.get('status'),reason:data.get('reason')},request));}
  function restrictionForm(id){const request=crypto.randomUUID();form('광장 이용 제한',`<p>개인 기록은 계속 사용할 수 있습니다. 제한 사유는 사용자에게 알림으로 전달됩니다.</p><label>제한 기간<select name="days"><option value="1">1일</option><option value="7">7일</option><option value="30">30일</option><option value="36500">영구 제한</option></select></label>${reasonField}`,data=>perform('restrict',{id,until:new Date(Date.now()+Number(data.get('days'))*86400000).toISOString(),reason:data.get('reason')},request));}
  function compose(id=''){
    const request=crypto.randomUUID();
    form('새 알림 작성',`<label>받는 사람<select name="audience"><option value="one" ${id?'selected':''}>개인</option><option value="all" ${id?'':'selected'}>전체 사용자</option></select></label><label>개인 수신자 ID<input name="id" value="${esc(id)}" placeholder="개인 발송 시 사용자 UUID 입력"></label><label>제목<input name="title" maxlength="160" required></label><label>내용<textarea name="body" maxlength="5000" required></textarea></label><p class="muted">실행 전 아래 미리보기에서 수신 대상과 내용을 다시 확인합니다.</p>`,async data=>{
      const payload={audience:data.get('audience'),id:data.get('audience')==='all'?null:String(data.get('id')).trim(),title:data.get('title'),body:data.get('body'),reason:'운영자 알림 발송'};
      if(payload.audience==='one'&&!/^[0-9a-f-]{36}$/i.test(payload.id))throw new Error('수신자 ID를 확인하세요.');
      form('발송 미리보기',`<p><strong>${payload.audience==='all'?'전체 사용자':esc(payload.id)}</strong>에게 보냅니다.</p><h3>${esc(payload.title)}</h3><div class="body-text">${esc(payload.body)}</div><label><input type="checkbox" required> 수신 대상과 내용을 확인했습니다.</label>`,()=>perform('message',payload,request));
    });
  }
  async function accountForm(id){
    const found=await rpc('operator_list',{p_kind:'users',p_search:id,p_status:'',p_offset:0});const user=found.find(x=>x.id===id);
    if(!user)throw new Error('사용자를 찾을 수 없습니다.');if(!$('#detail').open)return;
    const identity=`<div class="target-identity"><strong>${esc(user.display_name||'사용자')}</strong><p>${esc(user.email||'이메일 없는 게스트')}</p><p class="mono">${esc(id)}</p></div>`;
    const outcomes={ban:['계정 정지 7일','7일 동안 로그인과 앱 데이터 접근을 제한합니다. 기록은 삭제하지 않습니다.'],permanent_ban:['계정 영구 이용 제한','해제할 때까지 계정 이용을 제한합니다. 기록은 삭제하지 않습니다.'],unban:['계정 정지 해제','계정 이용을 다시 허용합니다. 별도로 적용한 광장 제한은 유지됩니다.'],delete:['계정 영구 삭제','계정, 연결된 기록, 업로드 파일을 영구 삭제합니다. 되돌릴 수 없으며 일부 삭제 후 실패할 수도 있습니다.']};
    form('계정 조치 선택',identity+`<label>조치<select name="action">${Object.entries(outcomes).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('')}</select></label>${reasonField}`,async data=>{
      const action=data.get('action'),reason=data.get('reason');
      form('최종 확인 · '+outcomes[action][0],identity+`<p class="danger">${outcomes[action][1]}</p><p>처리 사유: ${esc(reason)}</p><label>대상 사용자 ID를 다시 입력<input name="confirmation" required autocomplete="off"></label><label><input type="checkbox" required> 위 사용자와 조치 결과를 확인했습니다.</label>`,async confirmation=>{
        if(confirmation.get('confirmation')!==id)throw new Error('대상 ID가 일치하지 않습니다.');
        const {data:out,error}=await db.functions.invoke('operator-account',{body:{action,id,reason,confirmation:id}});if(error)throw error;if(out?.error)throw new Error(out.error);if(!out?.ok)throw new Error('완료 여부를 확인할 수 없습니다. 운영 기록을 확인하세요.');
        $('#detail').close();await load();notice('계정 조치가 완료되었습니다.');
      });
    });
  }
  checkAccess().catch(e=>notice(`운영실 연결 확인이 필요합니다: ${e.message}`,true));
})();
