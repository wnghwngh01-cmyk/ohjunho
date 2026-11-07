'use strict';
(function(global){
  const IDS={morning:8301,evening:21301},CHANNEL='haru-daily-reminders';
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
  async function cancel(){const api=plugin();if(!native()||!api)return;await api.cancel({notifications:Object.values(IDS).map(id=>({id}))})}
  async function sync(next=settings(),request=false){
    const api=plugin();if(!native()||!api)return{native:false,permission:'unavailable'};
    const allowed=await permission(request);await cancel();
    if(!next.deviceEnabled||allowed.display!=='granted')return{native:true,permission:allowed.display};
    const notifications=[];
    if(next.morningEnabled){const time=splitTime(next.morningTime,DEFAULTS.morningTime);notifications.push({id:IDS.morning,title:'☀️ 좋은 아침이에요!',body:'오늘의 할 일과 일정이 기다리고 있어요. 힘찬 하루 시작해 볼까요?',channelId:CHANNEL,schedule:{on:{hour:time.hour,minute:time.minute,second:0},repeats:true,allowWhileIdle:true},extra:{type:'today'}})}
    if(next.eveningEnabled){const time=splitTime(next.eveningTime,DEFAULTS.eveningTime);notifications.push({id:IDS.evening,title:'🌙 오늘 하루는 어떠셨나요?',body:'잠들기 전 소중한 하루의 순간을 일기로 담아보세요.',channelId:CHANNEL,schedule:{on:{hour:time.hour,minute:time.minute,second:0},repeats:true,allowWhileIdle:true},extra:{type:'diary'}})}
    if(notifications.length)await api.schedule({notifications});
    return{native:true,permission:allowed.display,count:notifications.length};
  }
  function emitAction(extra){const detail=extra&&typeof extra==='object'?extra:{};sessionStorage.setItem('haru:pending-notification-action',JSON.stringify(detail));global.dispatchEvent(new CustomEvent('haru:notification-action',{detail}))}
  function consumePending(){try{const raw=sessionStorage.getItem('haru:pending-notification-action');sessionStorage.removeItem('haru:pending-notification-action');return raw?JSON.parse(raw):null}catch{return null}}
  function render(){const value=settings(),map={notificationDeviceEnabled:value.deviceEnabled,notificationMorningEnabled:value.morningEnabled,notificationMorningTime:value.morningTime,notificationEveningEnabled:value.eveningEnabled,notificationEveningTime:value.eveningTime,notificationCommunityEnabled:value.communityEnabled};for(const [id,v] of Object.entries(map)){const el=document.getElementById(id);if(!el)continue;if(el.type==='checkbox')el.checked=!!v;else el.value=v}document.getElementById('notificationNativeNote')?.classList.toggle('hidden',native())}
  async function updateFromForm(){const value=save({deviceEnabled:!!document.getElementById('notificationDeviceEnabled')?.checked,morningEnabled:!!document.getElementById('notificationMorningEnabled')?.checked,morningTime:document.getElementById('notificationMorningTime')?.value||DEFAULTS.morningTime,eveningEnabled:!!document.getElementById('notificationEveningEnabled')?.checked,eveningTime:document.getElementById('notificationEveningTime')?.value||DEFAULTS.eveningTime,communityEnabled:!!document.getElementById('notificationCommunityEnabled')?.checked});const result=await sync(value,value.deviceEnabled);global.dispatchEvent(new CustomEvent('haru:notification-settings-saved',{detail:{settings:value,result}}));return result}
  function bind(){for(const id of ['notificationDeviceEnabled','notificationMorningEnabled','notificationMorningTime','notificationEveningEnabled','notificationEveningTime','notificationCommunityEnabled'])document.getElementById(id)?.addEventListener('change',()=>void updateFromForm());render()}
  async function init(id){userId=id||'guest';bind();const api=plugin();if(!native()||!api)return{native:false};try{await api.createChannel({id:CHANNEL,name:'하루 알림',description:'아침 브리핑과 저녁 일기 알림',importance:4,visibility:1,vibration:true});actionHandle=await api.addListener('localNotificationActionPerformed',event=>emitAction(event?.notification?.extra));const first=localStorage.getItem(promptedKey())!=='1';if(first)localStorage.setItem(promptedKey(),'1');return await sync(settings(),first)}catch(error){console.warn('기기 알림 초기화 실패',error);return{native:true,error}}}
  async function dispose(){if(actionHandle?.remove)await actionHandle.remove();actionHandle=null}
  global.HaruNotificationUI={DEFAULTS,settings,save,sync,render,init,dispose,consumePending,native};
})(window);
