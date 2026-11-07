import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const calls={cancel:[],schedule:[],channels:[],listeners:[]};
const store=new Map();
const elements=new Map(['notificationDeviceEnabled','notificationMorningEnabled','notificationMorningTime','notificationEveningEnabled','notificationEveningTime','notificationCommunityEnabled','notificationNativeNote'].map(id=>[id,{id,type:id.includes('Enabled')?'checkbox':'time',checked:true,value:id.includes('Morning')?'08:30':'21:30',classList:{toggle(){}},addEventListener(){}}]));
let permission='prompt';
const plugin={
  checkPermissions:async()=>({display:permission}),
  requestPermissions:async()=>({display:permission='granted'}),
  cancel:async value=>calls.cancel.push(value),
  schedule:async value=>calls.schedule.push(value),
  createChannel:async value=>calls.channels.push(value),
  addListener:async(name,callback)=>{calls.listeners.push({name,callback});return{remove:async()=>{}}}
};
const window={Capacitor:{isNativePlatform:()=>true,Plugins:{LocalNotifications:plugin}},dispatchEvent(){},addEventListener(){}};
const context={window,console,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))},sessionStorage:{getItem:key=>store.get(`s:${key}`)??null,setItem:(key,value)=>store.set(`s:${key}`,String(value)),removeItem:key=>store.delete(`s:${key}`)},document:{getElementById:id=>elements.get(id)||null}};
vm.runInNewContext(fs.readFileSync('js/notification-ui.js','utf8'),context);
const api=window.HaruNotificationUI;
const result=await api.init('user-1');
assert.equal(result.permission,'granted');
assert.equal(result.count,2);
assert.equal(calls.channels[0].id,'haru-daily-reminders');
assert.equal(calls.cancel.length,1);
assert.equal(calls.schedule.length,1);
const scheduled=calls.schedule[0].notifications;
assert.deepEqual(Array.from(scheduled.map(x=>x.extra.type)),['today','diary']);
assert.equal(scheduled[0].schedule.on.hour,8);
assert.equal(scheduled[0].schedule.on.minute,30);
assert.equal(scheduled[1].schedule.on.hour,21);
assert.equal(scheduled[1].schedule.on.minute,30);
assert.equal(scheduled.every(x=>x.schedule.repeats),true);

const changed=api.save({...api.settings(),morningEnabled:false,eveningTime:'22:10'});
await api.sync(changed,false);
assert.equal(calls.cancel.length,2,'설정 변경은 기존 예약을 먼저 취소해야 한다');
assert.equal(calls.schedule[1].notifications.length,1);
assert.equal(calls.schedule[1].notifications[0].schedule.on.hour,22);
assert.equal(calls.schedule[1].notifications[0].schedule.on.minute,10);

console.log('notification UI behavior PASS');
