'use strict';
(function(){
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const cfg=window.LAB_CONFIG;if(!window.supabase){$('#publicHero').innerHTML='<p>네트워크 연결을 확인해 주세요.</p>';return}
  const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY),slug=new URLSearchParams(location.search).get('slug')||'';
  const sourceLabel=t=>t==='record'?'기록':t==='project'?'프로젝트':'작업물';
  const publicUrl=path=>path?db.storage.from(cfg.PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl:'';
  async function boot(){
    if(!slug){$('#publicHero').innerHTML='<h1>연구실을 찾을 수 없습니다.</h1><p>공개 주소를 확인해 주세요.</p>';return}
    const {data:profiles,error}=await db.rpc('get_public_profile',{p_slug:slug});if(error||!profiles?.length){$('#publicHero').innerHTML='<h1>비공개 또는 없는 연구실입니다.</h1><p>연구실 주인이 공개 프로필을 끈 경우에도 이 화면이 표시됩니다.</p>';return}
    const p=profiles[0];document.title=`${p.lab_name} · 공개 연구실`;$('#publicHero').innerHTML=`<div class="row"><div class="avatar">${esc(String(p.display_name||'L').slice(0,1))}</div><div><span class="chip public">공개 연구실</span></div></div><h1>${esc(p.lab_name)}</h1><p>${esc(p.bio||`${p.display_name}님의 공개 포트폴리오입니다.`)}</p><div class="public-stats"><span>팔로워 ${Number(p.follower_count||0).toLocaleString('ko-KR')}</span><span>팔로잉 ${Number(p.following_count||0).toLocaleString('ko-KR')}</span></div>`;
    const {data:pubs,error:pe}=await db.rpc('get_public_profile_publications',{p_slug:slug,p_limit:60});if(pe){$('#publicFeed').innerHTML='<div class="empty">공개 작업을 불러오지 못했습니다.</div>';return}
    $('#publicFeed').innerHTML=pubs?.length?pubs.map(x=>{const cover=x.cover_path?publicUrl(x.cover_path):'';return `<article class="pub-card">${cover?`<div class="pub-cover"><img src="${esc(cover)}" alt="대표 이미지" loading="lazy"></div>`:''}<div class="pub-body"><div class="pub-meta"><span class="chip">${sourceLabel(x.source_type)}</span></div><h3>${esc(x.title)}</h3><p>${esc(x.body||'')}</p>${x.meta?.public_file_path?`<div class="record-actions"><a class="btn secondary small" href="${esc(publicUrl(x.meta.public_file_path))}" target="_blank" rel="noopener noreferrer">${esc(x.meta.public_file_name||'공개 파일')} 열기</a></div>`:''}</div></article>`}).join(''):'<div class="empty" style="grid-column:1/-1">아직 전체 공개한 포트폴리오가 없습니다.</div>';
  }
  boot().catch(()=>{$('#publicHero').innerHTML='<h1>불러오기 오류</h1><p>잠시 후 다시 시도해 주세요.</p>'});
})();
