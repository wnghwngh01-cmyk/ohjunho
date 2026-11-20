// Tailwind build for the Stitch Today screen (1_1, 2026-11-20). Theme mirrors the Stitch file's tailwind.config;
// utilities are scoped to #page-today. js/stitch-views.js holds the list templates, so it is scanned too.
module.exports={
  content:['./index.html','./js/stitch-views.js'],
  important:'#page-today',
  corePlugins:{preflight:false},
  theme:{extend:{
    fontFamily:{sans:['"Noto Sans KR"','-apple-system','BlinkMacSystemFont','system-ui','sans-serif']},
    colors:{bgPrimary:'#FAF9F6',surface:'#FFFFFF',borderSubtle:'#E9E8E5',divider:'#EFEEEB',textPrimary:'#1A1C1A',textSecondary:'#424844',textTertiary:'#8E928F',forest:'#1E3A2F',forestLight:'#2D5545',forestMuted:'#E8F1EC',mintBadge:'#C3ECD6',mintBadgeText:'#133E2B'},
    boxShadow:{subtle:'0 1px 4px rgba(0, 0, 0, 0.02)',card:'0 2px 8px rgba(0, 0, 0, 0.025)'}
  }}
};
