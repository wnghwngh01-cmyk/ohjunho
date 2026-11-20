// Tailwind build for the Stitch More screen (v7, 2026-11-20). Theme mirrors the Stitch file's tailwind.config;
// utilities are scoped to #page-more so they never leak into other pages.
module.exports={
  content:['./index.html'],
  important:'#page-more',
  corePlugins:{preflight:false},
  theme:{extend:{
    fontFamily:{sans:['Pretendard','-apple-system','BlinkMacSystemFont','system-ui','Roboto','sans-serif']},
    colors:{brand:{forest:'#1E3A2F',forestDark:'#162C23',forestLight:'#E8F1EC',mint:'#C3ECD6',coral:'#B45650',steel:'#4E70A0',amber:'#D97706',border:'#F0EFEA',card:'#FFFFFF',bg:'#FAF9F6'}}
  }}
};
