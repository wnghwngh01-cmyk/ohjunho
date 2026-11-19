import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const calls={cancel:[],schedule:[],channels:[],listeners:[],exactRequests:0,events:[]};
const store=new Map();
const ids=['notificationDeviceEnabled','notificationMorningEnabled','notificationMorningTime','notificationEveningEnabled','notificationEveningTime','notificationCommunityEnabled','notificationNativeNote','notificationExactRow','notificationExactRequest'];
const elements=new Map(ids.map(id=>[id,{id,type:id.includes('Enabled')?'checkbox':'time',checked:true,value:id.includes('Morning')?'08:30':'21:30',hidden:null,classList:{toggle(name,on){if(name==='hidden')elements.get(id).hidden=!!on}},addEventListener(){}}]));
let permission='prompt',exact='denied';
const plugin={
  checkPermissions:async()=>({display:permission}),
  requestPermissions:async()=>({display:permission='granted'}),
  checkExactNotificationSetting:async()=>({exact_alarm:exact}),
  changeExactNotificationSetting:async()=>{calls.exactRequests++;exact='granted';return{exact_alarm:exact}},
  cancel:async value=>calls.cancel.push(value),
  schedule:async value=>calls.schedule.push(value),
  createChannel:async value=>calls.channels.push(value),
  addListener:async(name,callback)=>{calls.listeners.push({name,callback});return{remove:async()=>{}}}
};
const window={Capacitor:{isNativePlatform:()=>true,Plugins:{LocalNotifications:plugin}},dispatchEvent(event){calls.events.push(event.type)},addEventListener(){}};
const context={window,console,Date,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))},sessionStorage:{getItem:key=>store.get(`s:${key}`)??null,setItem:(key,value)=>store.set(`s:${key}`,String(value)),removeItem:key=>store.delete(`s:${key}`)},document:{getElementById:id=>elements.get(id)||null}};
vm.runInNewContext(fs.readFileSync('js/notification-ui.js','utf8'),context);
const api=window.HaruNotificationUI;
const W=api.WINDOW_DAYS;

// Window math is deterministic for a fixed clock: 08:30 already passed at 10:00, 21:30 still ahead.
const now=new Date(2026,10,19,10,0,0);
const morning=api.upcoming('morning','08:30',now),evening=api.upcoming('evening','21:30',now);
assert.equal(morning.length,W);assert.equal(evening.length,W);
assert.equal(morning[0].at.getDate(),20,'a reminder time already passed today starts tomorrow');
assert.equal(evening[0].at.getDate(),19,'a reminder time later today is scheduled today');
assert.deepEqual([morning[0].at.getHours(),morning[0].at.getMinutes()],[8,30]);
assert.equal(new Set([...morning,...evening].map(x=>x.id)).size,W*2,'every slot needs its own notification id');
assert.ok(morning.every((x,i)=>i===0||x.at-morning[i-1].at>=23*3600e3),'one reminder per day');

const result=await api.init('user-1');
assert.equal(result.permission,'granted');
assert.equal(result.exact,'denied');
assert.equal(result.count,W*2);
assert.equal(calls.channels[0].id,'haru-daily-reminders');
assert.equal(calls.cancel.length,1);
const cancelled=calls.cancel[0].notifications.map(x=>x.id);
assert.ok(cancelled.includes(8301)&&cancelled.includes(21301),'legacy repeating reminders from older versions must be cancelled');
assert.equal(calls.schedule.length,1);
const scheduled=calls.schedule[0].notifications;
assert.ok(scheduled.every(x=>x.schedule.at instanceof Date&&x.schedule.allowWhileIdle===true&&!x.schedule.repeats&&!x.schedule.on),'reminders are one-shot exact alarms');
assert.ok(scheduled.every(x=>cancelled.includes(x.id)),'every scheduled id is cancelled on the next sync');
assert.deepEqual([...new Set(scheduled.map(x=>x.extra.type))],['today','diary']);
assert.equal(elements.get('notificationExactRow').hidden,false,'denied exact alarms show the in-app guidance row');
assert.ok(calls.events.includes('haru:exact-alarm-needed'),'first launch with denied exact alarms asks once');

calls.events.length=0;
await api.init('user-1');
assert.ok(!calls.events.includes('haru:exact-alarm-needed'),'the exact-alarm prompt is not repeated every launch');

const granted=await api.requestExact();
assert.equal(calls.exactRequests,1);
assert.equal(granted.exact,'granted');
assert.equal(elements.get('notificationExactRow').hidden,true,'guidance row hides once exact alarms are allowed');

const before=calls.schedule.length;
const changed=api.save({...api.settings(),morningEnabled:false,eveningTime:'22:10'});
await api.sync(changed,false);
const latest=calls.schedule[before].notifications;
assert.equal(latest.length,W,'disabling the morning reminder leaves only evening slots');
assert.ok(latest.every(x=>x.extra.type==='diary'&&x.schedule.at.getHours()===22&&x.schedule.at.getMinutes()===10));

const off=api.save({...api.settings(),deviceEnabled:false});
const scheduleCount=calls.schedule.length;
await api.sync(off,false);
assert.equal(calls.schedule.length,scheduleCount,'turning device reminders off schedules nothing');

console.log('notification UI behavior PASS (rolling exact window, legacy cancel, exact-alarm guidance)');
