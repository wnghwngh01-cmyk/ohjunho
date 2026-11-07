'use strict';
(function(global){
  // 통일된 24×24, stroke-width="1.75", round cap/join 선형 아이콘 시스템
  const PATHS={
    today:'<rect x="3.5" y="4.5" width="17" height="16" rx="3.5"/><path d="M8 3v3M16 3v3M3.5 9.5h17"/><circle cx="12" cy="14.5" r="2.2"/>',
    calendar:'<rect x="3.5" y="4.5" width="17" height="16" rx="3.5"/><path d="M8 3v3M16 3v3M3.5 9.5h17M8 13.5h2M14 13.5h2M8 17h2M14 17h2"/>',
    personal:'<rect x="3" y="5.5" width="18" height="13.5" rx="3"/><path d="M16 10.5h5v3.5h-5a1.75 1.75 0 0 1 0-3.5Z"/><path d="M7 9.5h4"/>',
    square:'<path d="M6.5 18.5 3.5 20V6.5a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-11Z"/><path d="M8 9.5h8M8 13h5"/>',
    more:'<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
    notifications:'<path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10Z"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/>',
    settings:'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    diary:'<path d="M5.5 4h11a2.5 2.5 0 0 1 2.5 2.5v13a.5.5 0 0 1-.5.5h-11A2.5 2.5 0 0 1 5 17.5v-11A2.5 2.5 0 0 1 5.5 4Z"/><path d="M8.5 8.5h7M8.5 12h5"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H19"/>',
    workout:'<path d="M6.5 7v10M17.5 7v10M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    records:'<rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8.5 8.5h7M8.5 12.5h7M8.5 16.5h4.5"/>',
    books:'<path d="M4 6a2.5 2.5 0 0 1 2.5-2.5H12v16H6.5A2.5 2.5 0 0 0 4 22V6Zm16 0a2.5 2.5 0 0 0-2.5-2.5H12v16h5.5A2.5 2.5 0 0 1 20 22V6Z"/>',
    lab:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.7.6 1.3 1.5 1.3 2.4h5c0-.9.6-1.8 1.3-2.4A6 6 0 0 0 12 3Z"/>',
    shelter:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>',
    forge:'<path d="M14.5 4.5 19.5 9.5M5 19l4.5-4.5M18.5 5.5l-9.5 9.5-3.5 1 1-3.5 9.5-9.5 2.5 2.5Z"/><path d="M14 14.5 18.5 19"/>',
    'today-settings':'<path d="M4 7h9M17 7h3M13 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 12h3M11 12h9M7 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 17h11M19 17h1M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>',
    goals:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/>',
    bug:'<rect x="7" y="7" width="10" height="12" rx="5"/><path d="M9.5 7V5.5a2.5 2.5 0 0 1 5 0V7M4 10.5h3M17 10.5h3M3.5 14h3.5M17 14h3.5M5 18l2.5-1.5M19 18l-2.5-1.5"/>',
    contact:'<path d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-6h4M4 12v5a2 2 0 0 0 2 2h2v-6H4"/>',
    support:'<path d="M12 20s-7-4.4-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    chevron:'<path d="m9 6 6 6-6 6"/>'
  };

  // 일기 기분 5종 미니멀 감성 벡터 아이콘
  const MOOD_PATHS={
    good:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 10.2c.4-.6 1.2-.6 1.6 0M13.9 10.2c.4-.6 1.2-.6 1.6 0"/><path d="M8.5 14c1 1.6 2.2 2.2 3.5 2.2s2.5-.6 3.5-2.2"/>',
    calm:'<circle cx="12" cy="12" r="8.5"/><path d="M8.2 10.6q1.1.8 2.2 0M13.6 10.6q1.1.8 2.2 0"/><path d="M9.2 14.5q2.8 1.4 5.6 0"/>',
    normal:'<circle cx="12" cy="12" r="8.5"/><circle cx="9.3" cy="10.3" r="0.9" fill="currentColor"/><circle cx="14.7" cy="10.3" r="0.9" fill="currentColor"/><path d="M9.2 14.6h5.6"/>',
    sad:'<circle cx="12" cy="12" r="8.5"/><circle cx="9.3" cy="10.3" r="0.9" fill="currentColor"/><circle cx="14.7" cy="10.3" r="0.9" fill="currentColor"/><path d="M9 15.8c.9-1.2 2-1.7 3-1.7s2.1.5 3 1.7"/>',
    hard:'<circle cx="12" cy="12" r="8.5"/><path d="m8.2 9.5 2.2 1.2m-2.2 1.2 2.2-1.2M15.8 9.5l-2.2 1.2m2.2 1.2-2.2-1.2"/><path d="M9 15.5q1.5-1.2 3 0t3 0"/>'
  };

  function svg(name,cls='haru-icon'){
    const body=PATHS[name]||PATHS.records;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  function moodSvg(key,cls='haru-mood-icon'){
    const body=MOOD_PATHS[key]||MOOD_PATHS.normal;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  function enhanceStaticIcons(root=document){
    if(!root?.querySelectorAll)return;
    // 하단 내비게이션 & 사이드 레일 아이콘 교체
    root.querySelectorAll('.bottom-nav button[data-go], .side-nav button[data-go], .side-bottom button[data-go]').forEach(btn=>{
      const page=btn.dataset.go;
      const slot=btn.querySelector('.ico, .nav-icon');
      if(slot&&PATHS[page])slot.innerHTML=svg(page,'haru-nav-svg');
    });
    // 상단바 알림 아이콘 교체
    const notiBtn=root.querySelector('#topbarNotifications > span[aria-hidden="true"]');
    if(notiBtn)notiBtn.innerHTML=svg('notifications','haru-topbar-svg');
    // 더보기 페이지 아이콘 + 우측 화살표 주입
    root.querySelectorAll('#page-more .more-grid button[data-go]').forEach(btn=>{
      const page=btn.dataset.go;
      const b=btn.querySelector('b');
      if(b&&PATHS[page])b.innerHTML=svg(page,'haru-more-svg');
      if(!btn.querySelector('.more-chevron')){
        btn.insertAdjacentHTML('beforeend',`<i class="more-chevron" aria-hidden="true">${svg('chevron','haru-chevron-svg')}</i>`);
      }
    });
    // 3만원 서약서 모달 인장 SVG 주입
    const seal=root.querySelector('#pledgeCertificatePaper .pledge-seal');
    if(seal&&global.HaruCosmeticsSupport?.renderSealSvg){
      seal.innerHTML=global.HaruCosmeticsSupport.renderSealSvg();
    }
  }

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>enhanceStaticIcons(document));
    else enhanceStaticIcons(document);
  }

  global.HaruIcons={svg,moodSvg,enhanceStaticIcons,applyAll:enhanceStaticIcons,PATHS,MOOD_PATHS};
})(typeof window!=='undefined'?window:globalThis);
