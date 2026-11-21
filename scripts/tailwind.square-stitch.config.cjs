// Tailwind build for the Stitch 광장 screens ("광장 (발견)", "광장 (앱 개선)", "광장 - 상태 모음", 2026-11-20).
// Utilities are scoped to #page-square. js/stitch-views.js holds the card, comment and feature templates.
module.exports={
  content:['./index.html','./js/stitch-views.js','./js/app.js'],
  important:'#page-square',
  corePlugins:{preflight:false},
  theme:{extend:{
    fontFamily:{sans:['Pretendard','-apple-system','BlinkMacSystemFont','system-ui','Roboto','Noto Sans KR','sans-serif']},
    boxShadow:{subtle:'0 2px 8px rgba(0, 0, 0, 0.025)'}
  }}
};
