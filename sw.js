const CACHE='daily-life-shell-v114'; // daily-life-shell-v112
// Keep this list aligned with index.html cache-busting URLs; fetch handling below remains network-first.
const SHELL=[
  './js/haru-icons.js','./js/haru-icons.js?v=20261107-stitch-v1',
  './js/recurring-ui.js?v=20261014-i1','./assets/recurring.css?v=20261014-i1','./js/writing-templates.js?v=20261014-h1','./assets/writing-templates.css?v=20261014-h1',
  './js/budget-ui.js?v=20261030-budget-preview-v1','./assets/budget.css?v=20261030-budget-preview-v1','./assets/shelter.css?v=20261030-shelter-v2','./assets/forge.css?v=20261104-forge-v3','./assets/cosmetics-support.css?v=20261106-customization-v1',
  './assets/profile-frames/ribbon-v3.png','./assets/profile-frames/blossom-v5.png','./assets/profile-frames/crown-v3.png','./assets/light-theme.css?v=20261030-square-author-v1','./assets/today-stitch.css?v=20261030-budget-preview-v2','./assets/material-symbols-outlined.ttf','./assets/contact.svg?v=20261017-operator-v2','./assets/avatar-frame.css?v=20261024-avatar-frame-v13','./assets/stitch-media/idea-cover.jpg','./assets/stitch-media/stitch-01.jpg','./assets/stitch-media/stitch-02.jpg','./assets/stitch-media/stitch-03.jpg','./assets/stitch-media/stitch-04.jpg','./assets/stitch-media/stitch-05.jpg','./assets/stitch-media/stitch-06.jpg','./assets/stitch-media/stitch-07.jpg','./assets/stitch-media/stitch-08.jpg','./assets/stitch-media/stitch-09.jpg','./assets/stitch-media/stitch-10.jpg','./assets/stitch-media/stitch-11.jpg','./assets/stitch-media/stitch-12.jpg',
  './','./index.html','./public.html','./privacy.html','./terms.html','./delete-account.html','./reset-password.html','./assets/stitch-redesign.css?v=20261107-v3','./assets/styles.css?v=20261107-notifications-v1','./assets/favicon.svg',
  './js/config.js?v=20260918-community-inserts-v1','./js/drafts.js?v=20260918-community-inserts-v1','./js/avatar-frame.js?v=20261106-customization-v1','./js/today-layout.js?v=20261106-customization-v1','./js/cosmetics-support-ui.js?v=20261106-customization-v1','./js/db.js?v=20261107-notifications-v1','./js/widget-bridge.js?v=20261030-widgets-v1','./js/notification-ui.js?v=20261107-notifications-v1','./js/storage.js?v=20261004-profile-photos-v1','./js/telemetry.js?v=20260920-error-logs-v1','./js/calendar-utils.js?v=20261002-calendar-history-v1','./js/diary-utils.js?v=20261002-diary-search-v1','./js/finance-utils.js?v=20261017-integration-v1','./js/shelter-ui.js?v=20261104-forge-v2','./js/forge-ui.js?v=20261104-forge-v5','./js/app.js?v=20261107-notifications-v1','./js/workout-ui.js?v=20261029-today-layout-v1','./js/project-files-ui.js?v=20260918-community-inserts-v1','./js/public.js?v=20261030-shelter-v2','./js/delete-account.js','./js/reset-password.js?v=20260919-password-recovery-v1','./manifest.webmanifest'
];
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
