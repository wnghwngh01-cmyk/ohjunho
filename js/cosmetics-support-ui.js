'use strict';
(function(global){
  const categories=Object.freeze([
    {id:'shelter',label:'하루 쉼터 (1 to 25)'},{id:'forge',label:'대장간의 전설'},{id:'daily',label:'성실한 일상'}
  ]);
  const titleCategory=code=>String(code||'').startsWith('forge_')?'forge':['weekly_1st','weekly_2nd','weekly_3rd','weekly_top10','master','diamond','gold','silver','bronze','regular'].includes(code)?'shelter':'daily';
  const certificateNumber=value=>`No. ${String(Math.max(0,Number(value)||0)).padStart(5,'0')}`;
  const certificateDate=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':`${date.getFullYear()}년 ${String(date.getMonth()+1).padStart(2,'0')}월 ${String(date.getDate()).padStart(2,'0')}일`};

  // 전통 전각 낙관 인장(하루之印) 순수 SVG (모달 표시용)
  function renderSealSvg(){
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" class="pledge-seal-svg" role="img" aria-label="하루를 담다 공식 전각 인장">
      <g transform="rotate(-6 48 48)">
        <rect x="8" y="8" width="80" height="80" rx="8" fill="#b32822" stroke="#7d1612" stroke-width="2.5"/>
        <rect x="13" y="13" width="70" height="70" rx="4" fill="none" stroke="#f9efe6" stroke-width="2" stroke-dasharray="48 3 22 2 36 4"/>
        <line x1="48" y1="14" x2="48" y2="82" stroke="#f9efe6" stroke-width="1.4" opacity="0.85"/>
        <line x1="14" y1="48" x2="82" y2="48" stroke="#f9efe6" stroke-width="1.4" opacity="0.85"/>
        <text x="31" y="38" text-anchor="middle" fill="#f9efe6" font-family="serif" font-weight="900" font-size="21">하</text>
        <text x="65" y="38" text-anchor="middle" fill="#f9efe6" font-family="serif" font-weight="900" font-size="21">루</text>
        <text x="31" y="71" text-anchor="middle" fill="#f9efe6" font-family="serif" font-weight="900" font-size="19">之</text>
        <text x="65" y="71" text-anchor="middle" fill="#f9efe6" font-family="serif" font-weight="900" font-size="19">印</text>
        <circle cx="22" cy="24" r="1.4" fill="#f7f0df" opacity="0.65"/>
        <circle cx="74" cy="62" r="1.8" fill="#f7f0df" opacity="0.55"/>
        <circle cx="56" cy="20" r="1.1" fill="#f7f0df" opacity="0.6"/>
      </g>
    </svg>`;
  }

  function drawCornerOrnament(ctx,x,y,sx,sy){
    if(!ctx.save)return;
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(sx,sy);
    ctx.strokeStyle='#8c6b32';
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(0,56);ctx.lineTo(0,0);ctx.lineTo(56,0);
    ctx.moveTo(12,42);ctx.lineTo(12,12);ctx.lineTo(42,12);
    ctx.stroke();
    ctx.fillStyle='#b6924e';
    ctx.beginPath();
    ctx.moveTo(22,22);ctx.lineTo(30,16);ctx.lineTo(36,22);ctx.lineTo(30,28);ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCertificate(canvas,status,name){
    const width=1400,height=990,ctx=canvas.getContext('2d');canvas.width=width;canvas.height=height;
    // 코튼 페이퍼 배경 및 이중 골드 세공 프레임
    ctx.fillStyle='#fbf7ee';ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='#8c6b32';ctx.lineWidth=8;ctx.strokeRect(36,36,width-72,height-72);
    ctx.strokeStyle='#c9ad73';ctx.lineWidth=2;ctx.strokeRect(52,52,width-104,height-104);
    ctx.strokeStyle='rgba(140,107,50,0.35)';ctx.lineWidth=1;ctx.strokeRect(62,62,width-124,height-124);

    // 4각 클래식 오너먼트
    drawCornerOrnament(ctx,44,44,1,1);
    drawCornerOrnament(ctx,width-44,44,-1,1);
    drawCornerOrnament(ctx,44,height-44,1,-1);
    drawCornerOrnament(ctx,width-44,height-44,-1,-1);

    // 상단 브랜드 엠블럼 & 일련번호
    ctx.textAlign='center';
    ctx.fillStyle='#7a5c29';ctx.font='600 20px sans-serif';
    ctx.fillText('HARU PLEDGE OF DEVOTION · 하루를 담다 공식 보증서',width/2,108);
    ctx.fillStyle='#5c431c';ctx.font='700 28px serif';
    ctx.fillText(certificateNumber(status?.certificate?.certificate_no),width/2,150);

    // 메인 타이틀
    ctx.fillStyle='#1b3329';ctx.font='700 58px serif';
    ctx.fillText('제작자의 개발 의지 보증 서약서',width/2,248);

    // 중앙 구분선
    if(ctx.moveTo){
      ctx.strokeStyle='#c9ad73';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(width/2-180,286);ctx.lineTo(width/2+180,286);ctx.stroke();
    }

    // 본문 서약 문구
    ctx.font='33px serif';ctx.fillStyle='#2f3b35';
    const lines=[
      `본 서약서는 ${name||'후원자'} 님의 소중한 응원 덕분에,`,
      '제작자 오준호가 ‘하루를 담다’를 절대 포기하거나 방치하지 않고',
      '매일의 기록이 오래도록 안전하게 숨 쉴 수 있도록',
      '끝까지 정성을 다해 가꾸어 나갈 것임을 엄숙히 보증합니다.'
    ];
    lines.forEach((line,index)=>ctx.fillText(line,width/2,380+index*64));

    // 발행 일자 및 서명
    ctx.font='27px sans-serif';ctx.fillStyle='#5b645f';
    ctx.fillText(`발행 일자   ${certificateDate(status?.certificate?.issued_at)}`,width/2,690);
    ctx.font='700 34px serif';ctx.fillStyle='#1e362c';
    ctx.fillText('하루를 담다 제작자  오 준 호',width/2,795);

    // 전통 전각 사각/원형 낙관 인장 렌더링 (기존 테스트 호환 arc 포함)
    ctx.beginPath();ctx.arc(1030,782,66,0,Math.PI*2);
    ctx.fillStyle='rgba(179,40,34,0.08)';ctx.fill();
    ctx.strokeStyle='#b32822';ctx.lineWidth=6;ctx.stroke();
    ctx.strokeRect(982,734,96,96);
    ctx.fillStyle='#b32822';ctx.font='700 28px serif';
    ctx.fillText('하루',1030,774);
    ctx.fillText('인장',1030,810);
    return canvas;
  }

  function downloadCertificate(status,name){
    const canvas=drawCertificate(document.createElement('canvas'),status,name);
    canvas.toBlob(blob=>{
      if(!blob)return;
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='haru-pledge-certificate.png';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    },'image/png');
  }

  global.HaruCosmeticsSupport={categories,titleCategory,certificateNumber,certificateDate,drawCertificate,downloadCertificate,renderSealSvg};
})(typeof window!=='undefined'?window:globalThis);
