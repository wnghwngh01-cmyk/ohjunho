const CACHE='daily-life-shell-v70';
const SHELL=['./assets/profile-frames/ribbon-v2.png','./assets/profile-frames/blossom-v3.png','./assets/profile-frames/crown-v3.png','./assets/light-theme.css?v=20261009-finance-analysis-v1','./assets/avatar-frame.css?v=20261010-avatar-frame-v5','./','./index.html','./public.html','./privacy.html','./terms.html','./delete-account.html','./reset-password.html','./assets/styles.css?v=20261009-finance-analysis-v1','./assets/favicon.svg','./js/config.js?v=20260918-community-inserts-v1','./js/drafts.js?v=20260918-community-inserts-v1','./js/avatar-frame.js?v=20261010-avatar-frame-v5','./js/db.js?v=20261010-avatar-frame-v5','./js/storage.js?v=20261004-profile-photos-v1','./js/telemetry.js?v=20260920-error-logs-v1','./js/calendar-utils.js?v=20261002-calendar-history-v1','./js/diary-utils.js?v=20261002-diary-search-v1','./js/finance-utils.js?v=20261003-finance-search-v3','./js/app.js?v=20261010-avatar-frame-v5','./js/project-files-ui.js?v=20260918-community-inserts-v1','./js/public.js?v=20261010-avatar-frame-v5','./js/delete-account.js','./js/reset-password.js?v=20260919-password-recovery-v1','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.filter(Boolean))).then(()=>self.skipWaiting()).catch(()=>{})));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/admin.html')||url.pathname.endsWith('/js/admin.js')||url.pathname.endsWith('/js/admin-data.js')||url.pathname.endsWith('/assets/admin.css'))return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
});
