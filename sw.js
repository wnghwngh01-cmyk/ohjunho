const CACHE='daily-life-shell-v62';
const SHELL=['./assets/light-theme.css?v=20261004-square-intro-remove-v1','./','./index.html','./public.html','./privacy.html','./terms.html','./delete-account.html','./reset-password.html','./assets/styles.css?v=20261004-square-intro-remove-v1','./assets/favicon.svg','./js/config.js?v=20260918-community-inserts-v1','./js/drafts.js?v=20260918-community-inserts-v1','./js/db.js?v=20261004-profile-photos-v1','./js/storage.js?v=20261004-profile-photos-v1','./js/telemetry.js?v=20260920-error-logs-v1','./js/calendar-utils.js?v=20261002-calendar-history-v1','./js/diary-utils.js?v=20261002-diary-search-v1','./js/finance-utils.js?v=20261003-finance-search-v3','./js/app.js?v=20261004-profile-photos-v1','./js/project-files-ui.js?v=20260918-community-inserts-v1','./js/public.js?v=20261004-profile-photos-v1','./js/delete-account.js','./js/reset-password.js?v=20260919-password-recovery-v1','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.filter(Boolean))).then(()=>self.skipWaiting()).catch(()=>{})));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
});
