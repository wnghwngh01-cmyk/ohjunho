'use strict';
(function(global){
  const categories=Object.freeze([
    {id:'shelter',label:'🎮 하루 쉼터 (1 to 25)'},{id:'forge',label:'⚔️ 대장간의 전설'},{id:'daily',label:'🏆 성실한 일상'}
  ]);
  const titleCategory=code=>String(code||'').startsWith('forge_')?'forge':['weekly_1st','weekly_2nd','weekly_3rd','weekly_top10','master','diamond','gold','silver','bronze','regular'].includes(code)?'shelter':'daily';
  const certificateNumber=value=>`No. ${String(Math.max(0,Number(value)||0)).padStart(5,'0')}`;
  const certificateDate=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':`${date.getFullYear()}년 ${String(date.getMonth()+1).padStart(2,'0')}월 ${String(date.getDate()).padStart(2,'0')}일`};
  function drawCertificate(canvas,status,name){
    const width=1400,height=990,ctx=canvas.getContext('2d');canvas.width=width;canvas.height=height;
    ctx.fillStyle='#f7f0df';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#8c6b32';ctx.lineWidth=10;ctx.strokeRect(34,34,width-68,height-68);ctx.strokeStyle='#c3a76a';ctx.lineWidth=2;ctx.strokeRect(54,54,width-108,height-108);
    ctx.textAlign='center';ctx.fillStyle='#6d5328';ctx.font='700 30px serif';ctx.fillText(certificateNumber(status?.certificate?.certificate_no),width/2,115);
    ctx.fillStyle='#1f332b';ctx.font='700 62px serif';ctx.fillText('제작자의 개발 의지 보증 서약서',width/2,230);
    ctx.font='32px serif';ctx.fillStyle='#3d463f';const lines=[`본 서약서는 ${name||'후원자'} 님의 소중한 응원 덕분에,`,'제작자 오준호가 하루를 담다를 절대 포기하거나 방치하지 않고','정성을 다해 가꾸어 나갈 것임을 엄숙히 보증합니다.'];lines.forEach((line,index)=>ctx.fillText(line,width/2,390+index*66));
    ctx.font='28px sans-serif';ctx.fillStyle='#5b625e';ctx.fillText(`발행 일자  ${certificateDate(status?.certificate?.issued_at)}`,width/2,660);
    ctx.font='700 32px serif';ctx.fillStyle='#253b31';ctx.fillText('하루를 담다 제작자 오준호  (인)',width/2,805);
    ctx.beginPath();ctx.arc(1060,790,70,0,Math.PI*2);ctx.fillStyle='rgba(164,47,43,.12)';ctx.fill();ctx.strokeStyle='#a42f2b';ctx.lineWidth=8;ctx.stroke();ctx.fillStyle='#a42f2b';ctx.font='700 30px serif';ctx.fillText('하루',1060,782);ctx.fillText('인장',1060,822);return canvas;
  }
  function downloadCertificate(status,name){const canvas=drawCertificate(document.createElement('canvas'),status,name);canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='haru-pledge-certificate.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')}
  global.HaruCosmeticsSupport={categories,titleCategory,certificateNumber,certificateDate,drawCertificate,downloadCertificate};
})(typeof window!=='undefined'?window:globalThis);
