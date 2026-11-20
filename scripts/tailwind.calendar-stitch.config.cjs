// Tailwind build for the Stitch Calendar screen (calendar.html, 2026-11-20). Theme mirrors the Stitch file's tailwind.config;
// utilities are scoped to #page-calendar. js/stitch-views.js holds the cell/row templates, so it is scanned too.
module.exports={
  content:['./index.html','./js/stitch-views.js'],
  important:'#page-calendar',
  corePlugins:{preflight:false},
  theme:{extend:{
    fontFamily:{sans:['Pretendard','-apple-system','BlinkMacSystemFont','system-ui','Roboto','sans-serif']},
    colors:{brand:{forest:'#1E3A2F',forestDark:'#162C23',forestLight:'#E8F1EC',mint:'#C3ECD6',coral:'#B45650',steel:'#4E70A0',amber:'#D97706',bgLight:'#FAF9F6',cardBorder:'#F0EFEA'}}
  }}
};
