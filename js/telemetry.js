'use strict';
(function(){
  const recent=new Map();
  const COOLDOWN=5*60*1000;
  const clean=value=>String(value||'')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,'[id]')
    .replace(/https?:\/\/\S+/gi,'[url]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,'[token]')
    .slice(0,500);
  const hash=value=>{let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};

  async function report(context,error){
    try{
      const db=window.LabDB,user=db?.user?.();
      if(!user||!db?.client)return false;
      const code=clean(error?.code||error?.cause?.code||error?.name||'unknown').slice(0,80);
      const message=clean(error?.message||error||'오류가 발생했습니다.');
      const safeContext=clean(context||'unknown').slice(0,80);
      const fingerprint=hash(`${safeContext}|${code}|${message}`);
      const now=Date.now();if(now-(recent.get(fingerprint)||0)<COOLDOWN)return false;
      recent.set(fingerprint,now);
      const {error:sendError}=await db.client.rpc('log_client_error',{
        p_context:safeContext,p_error_code:code,p_message:message,p_fingerprint:fingerprint,
        p_page_path:location.pathname.slice(0,200),p_release_stage:Number(window.LAB_CONFIG?.RELEASE_STAGE)||null,
        p_online:navigator.onLine
      });
      if(sendError)recent.delete(fingerprint);
      return !sendError;
    }catch{return false}
  }

  window.addEventListener('error',event=>{void report('window.error',event.error||event.message)});
  window.addEventListener('unhandledrejection',event=>{void report('unhandledrejection',event.reason)});
  window.LabTelemetry={report,clean};
})();
