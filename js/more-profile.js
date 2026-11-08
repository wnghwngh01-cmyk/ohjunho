'use strict';
(function(){
  const DAY_MS=86400000;
  function view(profile={},user={},now=Date.now()){
    const displayName=String(profile.display_name||'사용자').trim()||'사용자';
    const createdAt=user.created_at||profile.created_at||'';
    const created=createdAt?new Date(createdAt):null;
    const days=created&&!Number.isNaN(created.getTime())?Math.max(1,Math.floor((Number(now)-created.getTime())/DAY_MS)+1):null;
    return {displayName,avatarPath:profile.avatar_path||'',days,streakText:days?`기록 ${days}일째`:'기록 시작'};
  }
  window.HaruMoreProfile={view};
})();
