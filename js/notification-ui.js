'use strict';
(function(global){
  // Legacy repeating IDs (8301/21301) are still cancelled so older installs migrate cleanly.
  // Reminders are now one-shot exact alarms for the next WINDOW_DAYS days; the window is refilled on every launch/resume,
  // because the plugin re-arms repeating "on" schedules with a non-wakeup alarm that Doze can delay.
  const IDS={morning:8301,evening:21301},BASE={morning:830000,evening:2130000},WINDOW_DAYS=14,CHANNEL='haru-daily-reminders';
  const windowIds=()=>Object.values(BASE).flatMap(base=>Array.from({length:WINDOW_DAYS+1},(_,i)=>base+i));
  const DEFAULTS={deviceEnabled:true,morningEnabled:true,morningTime:'08:30',eveningEnabled:true,eveningTime:'21:30',communityEnabled:true};
  let userId='guest',actionHandle=null;
  const native=()=>!!global.Capacitor?.isNativePlatform?.();
  const plugin=()=>global.Capacitor?.Plugins?.LocalNotifications;
  const key=()=>`haru:notification-settings:v1:${userId}`;
  const promptedKey=()=>`haru:notification-permission-asked:v1`;
  function settings(){try{return{...DEFAULTS,...JSON.parse(localStorage.getItem(key())||'{}')}}catch{return{...DEFAULTS}}}
  function save(next){const value={...DEFAULTS,...next};localStorage.setItem(key(),JSON.stringify(value));return value}
  function splitTime(value,fallback){const match=/^(\d{2}):(\d{2})$/.exec(value||fallback);return{hour:Number(match?.[1]||fallback.slice(0,2)),minute:Number(match?.[2]||fallback.slice(3))}}
  async function permission(request=false){const api=plugin();if(!native()||!api)return{display:'unavailable'};let result=await api.checkPermissions();if(request&&result.display!=='granted')result=await api.requestPermissions();return result}
  async function cancel(){const api=plugin();if(!native()||!api)return;await api.cancel({notifications:[...Object.values(IDS),...windowIds()].map(id=>({id}))})}
  async function exactStatus(){const api=plugin();if(!native()||!api?.checkExactNotificationSetting)return'granted';try{return(await api.checkExactNotificationSetting())?.exact_alarm||'granted'}catch{return'granted'}}
  const MESSAGES={morning:{title:'☀️ 좋은 아침이에요!',body:'오늘의 할 일과 일정이 기다리고 있어요. 힘찬 하루 시작해 볼까요?',type:'today'},evening:{title:'🌙 오늘 하루는 어떠셨나요?',body:'잠들기 전 소중한 하루의 순간을 일기로 담아보세요.',type:'diary'}};
  function upcoming(kind,value,now=new Date()){const time=splitTime(value,DEFAULTS[`${kind}Time`]),out=[];for(let i=0;i<=WINDOW_DAYS&&out.length<WINDOW_DAYS;i++){const at=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,time.hour,time.minute,0,0);if(at.getTime()>now.getTime()+5000)out.push({id:BASE[kind]+out.length,at})}return out}
  async function sync(next=settings(),request=false){
    const api=plugin();if(!native()||!api)return{native:false,permission:'unavailable'};
    const allowed=await permission(request);await cancel();
    const exact=await exactStatus();
    if(!next.deviceEnabled||allowed.display!=='granted'){render(exact);return{native:true,permission:allowed.display,exact}}
    const notifications=[];
    for(const kind of ['morning','evening']){if(!next[`${kind}Enabled`])continue;const m=MESSAGES[kind];for(const slot of upcoming(kind,next[`${kind}Time`]))notifications.push({id:slot.id,title:m.title,body:m.body,channelId:CHANNEL,schedule:{at:slot.at,allowWhileIdle:true},extra:{type:m.type}})}
    if(notifications.length)await api.schedule({notifications});
    render(exact);
    return{native:true,permission:allowed.display,exact,count:notifications.length};
  }
  async function requestExact(){const api=plugin();if(!native()||!api?.changeExactNotificationSetting)return{exact:'granted'};try{await api.changeExactNotificationSetting()}catch(error){console.warn('정시 알림 설정 열기 실패',error)}return sync(settings(),false)}
  async function refresh(){try{return await sync(settings(),false)}catch(error){console.warn('알림 예약 갱신 실패',error);return{error}}}
  function emitAction(extra){const detail=extra&&typeof extra==='object'?extra:{};sessionStorage.setItem('haru:pending-notification-action',JSON.stringify(detail));global.dispatchEvent(new CustomEvent('haru:notification-action',{detail}))}
  function consumePending(){try{const raw=sessionStorage.getItem('haru:pending-notification-action');sessionStorage.removeItem('haru:pending-notification-action');return raw?JSON.parse(raw):null}catch{return null}}
  let lastExact='granted';
  function render(exact=lastExact){lastExact=exact;const row=document.getElementById('notificationExactRow');if(row)row.classList.toggle('hidden',!(native()&&settings().deviceEnabled&&exact==='denied'));const value=settings(),map={notificationDeviceEnabled:value.deviceEnabled,notificationMorningEnabled:value.morningEnabled,notificationMorningTime:value.morningTime,notificationEveningEnabled:value.eveningEnabled,notificationEveningTime:value.eveningTime,notificationCommunityEnabled:value.communityEnabled};for(const [id,v] of Object.entries(map)){const el=document.getElementById(id);if(!el)continue;if(el.type==='checkbox')el.checked=!!v;else el.value=v}document.getElementById('notificationNativeNote')?.classList.toggle('hidden',native())}
  async function updateFromForm(){const value=save({deviceEnabled:!!document.getElementById('notificationDeviceEnabled')?.checked,morningEnabled:!!document.getElementById('notificationMorningEnabled')?.checked,morningTime:document.getElementById('notificationMorningTime')?.value||DEFAULTS.morningTime,eveningEnabled:!!document.getElementById('notificationEveningEnabled')?.checked,eveningTime:document.getElementById('notificationEveningTime')?.value||DEFAULTS.eveningTime,communityEnabled:!!document.getElementById('notificationCommunityEnabled')?.checked});const result=await sync(value,value.deviceEnabled);global.dispatchEvent(new CustomEvent('haru:notification-settings-saved',{detail:{settings:value,result}}));return result}
  let bound=false;
  function bind(){if(!bound){bound=true;for(const id of ['notificationDeviceEnabled','notificationMorningEnabled','notificationMorningTime','notificationEveningEnabled','notificationEveningTime','notificationCommunityEnabled'])document.getElementById(id)?.addEventListener('change',()=>void updateFromForm());document.getElementById('notificationExactRequest')?.addEventListener('click',()=>void requestExact())}render()}
  const exactPromptKey=()=>'haru:exact-alarm-asked:v1';
  async function init(id){userId=id||'guest';bind();const api=plugin();if(!native()||!api)return{native:false};try{await api.createChannel({id:CHANNEL,name:'하루 알림',description:'아침 브리핑과 저녁 일기 알림',importance:4,visibility:1,vibration:true});actionHandle=await api.addListener('localNotificationActionPerformed',event=>emitAction(event?.notification?.extra));const first=localStorage.getItem(promptedKey())!=='1';if(first)localStorage.setItem(promptedKey(),'1');const result=await sync(settings(),first);if(result.permission==='granted'&&settings().deviceEnabled&&result.exact==='denied'&&localStorage.getItem(exactPromptKey())!=='1'){localStorage.setItem(exactPromptKey(),'1');global.dispatchEvent(new CustomEvent('haru:exact-alarm-needed',{detail:result}))}return result}catch(error){console.warn('기기 알림 초기화 실패',error);return{native:true,error}}}
  async function dispose(){if(actionHandle?.remove)await actionHandle.remove();actionHandle=null}
  global.HaruNotificationUI={DEFAULTS,WINDOW_DAYS,settings,save,sync,refresh,requestExact,exactStatus,upcoming,render,init,dispose,consumePending,native};
})(window);
