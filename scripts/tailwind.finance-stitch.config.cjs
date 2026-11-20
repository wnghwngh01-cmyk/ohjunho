// Tailwind build for the Stitch 가계부 screen ("가계부 (Account 메인 최종 수정본)", 2026-11-20). Theme mirrors the Stitch file's
// tailwind.config; utilities are scoped to #page-personal. js/stitch-views.js and the budget/recurring UIs hold row templates.
module.exports={
  content:['./index.html','./js/stitch-views.js','./js/budget-ui.js','./js/recurring-ui.js','./js/app.js'],
  important:'#page-personal',
  corePlugins:{preflight:false},
  theme:{extend:{
    fontFamily:{sans:['Pretendard','-apple-system','BlinkMacSystemFont','system-ui','Roboto','Noto Sans KR','sans-serif']},
    colors:{haru:{bg:'#FAF9F6',card:'#FFFFFF',border:'#F0EFEA',borderLight:'#E9E8E5',primary:'#1E3A2F',primaryDark:'#162C23',primaryLight:'#E8F1EC',mintBadge:'#C3ECD6',mintText:'#133E2B',text:'#1A1C1A',subtext:'#424844',muted:'#8E928F',coral:'#B45650',coralBg:'#FDF0EE',coralBorder:'#FAD4D1'}},
    boxShadow:{haru:'0 2px 8px rgba(0, 0, 0, 0.025)'}
  }}
};