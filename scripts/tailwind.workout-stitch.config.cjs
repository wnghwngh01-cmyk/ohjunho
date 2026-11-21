// Tailwind build for the Stitch 운동 screens ("운동 (운동 관리)", "운동 (단백질 기록)", "운동 (상태 모음)", 2026-11-21).
// Utilities are scoped to #workoutPage. js/workout-ui.js holds the section, exercise, history and protein templates.
module.exports={
  content:['./index.html','./js/workout-ui.js'],
  important:'#workoutPage',
  corePlugins:{preflight:false},
  // Touch screens: a tapped button must not keep its hover colour.
  future:{hoverOnlyWhenSupported:true},
  theme:{extend:{
    fontFamily:{sans:['Pretendard','-apple-system','BlinkMacSystemFont','system-ui','Roboto','Noto Sans KR','sans-serif']},
    boxShadow:{subtle:'0 2px 8px rgba(0, 0, 0, 0.025)'}
  }}
};
