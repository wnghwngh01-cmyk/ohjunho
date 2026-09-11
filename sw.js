const CACHE='personal-lab-shell-v15';
const SHELL=['./','./index.html','./public.html','./privacy.html','./terms.html','./delete-account.html','./assets/styles.css?v=20260911-stage4-3','./js/config.js?v=20260911-stage4-2','./js/drafts.js?v=20260911-stage4-2','./js/db.js?v=20260911-stage4-2','./js/storage.js?v=20260911-stage4-2','./js/app.js?v=20260911-stage4-3','./js/project-files-ui.js?v=20260911-stage4-2','./js/public.js','./js/delete-account.js','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.filter(Boolean))).then(()=>self.skipWaiting()).catch(()=>{})));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
});
