import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const utilitySource=fs.readFileSync(new URL('../js/calendar-utils.js',import.meta.url),'utf8');
const context={globalThis:{}};
vm.runInNewContext(utilitySource,context);
const Cal=context.globalThis.HaruCalendar;

assert.ok(Cal,'calendar utility should be available');
assert.equal(Cal.sanitizeColor('blue'),'blue');
assert.equal(Cal.sanitizeColor('not-allowed'),'forest');

const sameDay=[1,2,3,4].map(id=>({id,name:`일정 ${id}`,start_date:'2026-10-14',end_date:'2026-10-14',color_key:'forest'}));
const crowded=Cal.buildEventLayout(sameDay,'2026-10-11',7,2).get('2026-10-14');
assert.equal(crowded.slots.filter(Boolean).length,2,'two events should remain visible');
assert.equal(crowded.hidden,2,'the remaining events should be represented by +2');
const exactlyTwo=Cal.buildEventLayout(sameDay.slice(0,2),'2026-10-11',7,2).get('2026-10-14');
assert.equal(exactlyTwo.slots.length,2,'both same-day events should render as badges');
assert.equal(exactlyTwo.hidden,0,'two same-day events must not produce a false +1 count');

const userEventsBeforeHoliday=Cal.buildEventLayout([
  {id:'holiday:2026-10-14',name:'공휴일',start_date:'2026-10-14',end_date:'2026-10-14',system:true},
  {id:'user-a',name:'사용자 일정 A',start_date:'2026-10-14',end_date:'2026-10-14'},
  {id:'user-b',name:'사용자 일정 B',start_date:'2026-10-14',end_date:'2026-10-14'}
],'2026-10-11',7,2).get('2026-10-14');
assert.equal(userEventsBeforeHoliday.slots.filter(Boolean).map(slot=>slot.event.id).join(','),'user-a,user-b','two user-created events should stay visible before a system holiday');
assert.equal(userEventsBeforeHoliday.hidden,1,'the remaining holiday should be represented by +1');
const stableOrder=[
  {id:'later-id',name:'나중 일정',start_date:'2026-10-14',end_date:'2026-10-14',created_at:'2026-10-14T01:00:00Z',done:false},
  {id:'earlier-id',name:'먼저 만든 일정',start_date:'2026-10-14',end_date:'2026-10-14',created_at:'2026-10-14T00:00:00Z',done:false}
];
assert.equal([...stableOrder].sort(Cal.compareEvents).map(event=>event.id).join(','),'earlier-id,later-id','same-day events should keep their creation order');
stableOrder[1].done=true;
assert.equal([...stableOrder].sort(Cal.compareEvents).map(event=>event.id).join(','),'earlier-id,later-id','checking an event must not change its position');

const ranged=Cal.buildEventLayout([
  {id:'one',name:'하루 일정',start_date:'2026-10-15',end_date:'2026-10-15'},
  {id:'middle',name:'중간 일정',start_date:'2026-10-14',end_date:'2026-10-16'},
  {id:'long',name:'긴 일정',start_date:'2026-10-13',end_date:'2026-10-17'}
],'2026-10-11',7,2);
assert.equal(ranged.get('2026-10-13').slots[0].event.id,'long');
assert.equal(ranged.get('2026-10-15').slots[0].event.id,'long','the longest range should keep the first lane');
assert.equal(ranged.get('2026-10-15').slots[1].event.id,'middle','the next longest range should keep the second lane');
assert.equal(ranged.get('2026-10-15').hidden,1,'a one-day event should move into +N when both longer lanes are occupied');

const holidayRows=Cal.holidayEvents('2026-10-01',10);
assert.ok(holidayRows.some(e=>e.name==='개천절'&&e.system&&e.start_date==='2026-10-03'),'holidays should be immutable system events');

const habits=[
  {id:'daily',schedule:{type:'daily',start_date:'2026-10-14'}},
  {id:'flex',schedule:{type:'weekly_n',count:2,start_date:'2026-10-12'}}
];
assert.equal(Cal.habitMarker('2026-10-13',habits,[],'2026-10-15'),'','dates before habit creation should have no marker');
assert.equal(Cal.habitMarker('2026-10-14',habits,[],'2026-10-15'),'','past incomplete dates should have no marker');
assert.equal(Cal.habitMarker('2026-10-15',habits,[],'2026-10-15'),'pending','today should show a dot while scheduled habits remain');
assert.equal(Cal.habitMarker('2026-10-16',habits,[],'2026-10-15'),'','future dates should have no marker');
assert.equal(Cal.habitMarker('2026-10-14',[habits[0]],[{habit_id:'daily',day:'2026-10-14',completed:true}],'2026-10-15'),'complete');
assert.equal(Cal.habitRunsOn('2026-10-13',habits[0],[],{includeBeforeStart:true}),true,'past calendar details should allow retroactive checklist entries');
assert.equal(Cal.habitMarker('2026-10-13',[habits[0]],[{habit_id:'daily',day:'2026-10-13',completed:true}],'2026-10-15'),'complete','a retroactively completed past checklist should show a check marker');
const progress=Cal.weeklyProgress(habits[1],'2026-10-15',[
  {habit_id:'flex',day:'2026-10-12',completed:true},
  {habit_id:'flex',day:'2026-10-13',completed:true},
  {habit_id:'flex',day:'2026-10-15',completed:true}
],'2026-10-15');
assert.deepEqual({...progress},{completed:3,target:2});
const weeklyChecks=[
  {habit_id:'flex',day:'2026-10-12',completed:true},
  {habit_id:'flex',day:'2026-10-13',completed:true}
];
assert.equal(Cal.habitRunsOn('2026-10-13',habits[1],weeklyChecks),true,'the target completion day remains visible');
assert.equal(Cal.habitRunsOn('2026-10-14',habits[1],weeklyChecks),false,'weekly habits should hide on following days after reaching the cap');
assert.equal(Cal.habitRunsOn('2026-10-19',habits[1],weeklyChecks),true,'weekly habits should reset on Monday');

assert.equal(Cal.holidayFor('2026-09-25'),'추석');
assert.equal(Cal.holidayFor('2027-07-17'),'제헌절');

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const calendarCss=fs.readFileSync(new URL('../assets/calendar-stitch.css',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step9_calendar_upgrade.sql',import.meta.url),'utf8');
// Final Stitch calendar markup (calendar.html, 2026-11-20).
const page=html.match(/<section id="page-calendar"[\s\S]*?<\/section>\s*<section id="page-/)?.[0]||'';
assert.ok(page,'calendar section should exist');
assert.doesNotMatch(page,/style\s*=/,'calendar markup must not contain inline style attributes (CSP style-src self)');
assert.match(html,/<select id="eventColor"/,'event color uses the Stitch select');
for(const color of ['forest','amber','rose','blue'])assert.match(page,new RegExp(`<option value="${color}"`),`event color option ${color}`);
assert.match(html,/calendar-utils\.js\?v=20261120-stitch-v1/);
assert.match(html,/calendar-stitch\.css\?v=20261120-stitch-v1/);
assert.match(html,/calendar-stitch\.generated\.css\?v=20261120-stitch-v2/);
for(const id of ['calendarMonth','calPrev','calToday','calNext','calendarDays','selectedDayTitle','selectedEventCount','selectedEvents','eventComposer','eventName','eventStart','eventEnd','eventImportant','eventCancel','eventAdd','selectedHabitSubDate','selectedHabits','habitConfig','habitTemplateList','habitNewName','habitSchedule','habitWeeklyCountWrap','habitWeeklyCount','habitCancel','habitAdd'])assert.match(page,new RegExp(`id="${id}"`),`calendar hook ${id}`);
assert.match(html,/id="habitWeekdayPicker"[^]*?value="6"[^]*?value="0"/,'weekday picker covers Monday..Sunday');
assert.equal((html.match(/id="habitWeekdayPicker"/g)||[]).length,1,'weekday picker id must not be duplicated');
assert.doesNotMatch(page,/TIME MANAGEMENT/,'legacy calendar page heading must be removed');
assert.match(db,/color_key:eventColor\(colorKey\)/);
assert.match(db,/listEventsForMonth[^\n]*\.order\('start_date'\)\.order\('created_at'\)\.order\('id'\)/,'calendar event queries should have a deterministic order');
assert.match(app,/Cal\.buildEventLayout\(calendarItems,gridStart,42,2\)/);
assert.match(app,/Views\.calendarCell\(\{[^}]*status:Cal\.habitDayStatus\(k,state\.habits,state\.habitChecks,today\)\}\)/,'calendar cells show the due-habit status');
assert.match(app,/\(cell\?\.slots\|\|\[\]\)\.filter\(Boolean\)/,'calendar cells render real event badges only');
assert.match(app,/const habitOptions=\{includeBeforeStart:day<DB\.today\(\)\}/,'past calendar days still accept retroactive checklist entries');
assert.match(app,/h\.schedule\?\.type!=='weekly_n'\|\|Cal\.habitRunsOn\(day,h,state\.habitChecks,habitOptions\)/,'weekly habits must stop appearing after the target is reached');
assert.doesNotMatch(app,/목표를 넘겨도 계속 체크할 수 있어요/);
assert.match(app,/const updated=await withError\(\(\)=>DB\.toggleEvent[^\n]*state\.calendarEvents\[index\]=\{\.\.\.state\.calendarEvents\[index\],\.\.\.updated\}/,'checking a calendar event should update in place without reordering the list');
assert.match(app,/\$\('#calPrevMobile'\)\?\.addEventListener/,'removed mobile navigation compatibility binding must be null-safe');
assert.match(calendarCss,/body:has\(#page-calendar\.active\) \.topbar\{display:none!important\}/,'calendar route must hide the global topbar');
assert.match(calendarCss,/#page-calendar details>summary::-webkit-details-marker/,'legacy details markers must be removed');
assert.match(calendarCss,/#page-calendar \[data-event-toggle\]::before\{content:'';position:absolute;inset:-14px\}/,'16px checkbox keeps a 44px touch target');

// Stitch templates: no "다음 날", subtitle is the date only, rest-day habits are disabled.
const viewsSource=fs.readFileSync(new URL('../js/stitch-views.js',import.meta.url),'utf8');
const viewContext={globalThis:{}};vm.runInNewContext(viewsSource,viewContext);
const Views=viewContext.globalThis.HaruStitchViews;
const row=Views.calendarEventRow({id:'e1',name:'회의',start_date:'2026-11-20',end_date:'2026-11-22',color_key:'blue'});
assert.doesNotMatch(row,/다음 날|data-move-event/,'calendar event rows have no next-day button');
assert.match(row,/<div class="text-\[10\.5px\] text-\[#888\]">11\.20 ~ 11\.22<\/div>/,'event subtitle shows only the date range');
assert.match(row,/data-edit-event="e1"/);assert.match(row,/data-delete-event="e1"/);
assert.match(Views.calendarEventRow({id:'e2',name:'하루',start_date:'2026-11-20',end_date:'2026-11-20'}),/>11\.20<\/div>/);
const holidayRow=Views.calendarEventRow({id:'holiday:x',name:'성탄절',start_date:'2026-12-25',end_date:'2026-12-25',system:true});
assert.doesNotMatch(holidayRow,/<button/,'holidays cannot be edited or checked');
const cell=Views.calendarCell({day:'2026-11-22',dayNum:22,col:0,isCurr:true,isSel:true,slots:[{name:'A',color_key:'rose'},{name:'B',color_key:'forest',important:true}],hidden:3,status:'complete'});
assert.doesNotMatch(cell,/style=/,'cells must not use style attributes');
assert.match(cell,/text-\[#B45650\]">22</,'Sunday number is coral');
assert.match(cell,/ring-2 ring-inset ring-\[#1E3A2F\]/,'selected day ring');
assert.match(cell,/aria-label="체크리스트 완료"/);assert.match(cell,/\+3개/);
assert.match(Views.calendarCell({day:'2026-11-21',dayNum:21,col:6,isCurr:true,status:'partial'}),/text-\[#4E70A0\]">21<[^]*체크리스트 일부 완료/);
const restRow=Views.calendarHabitRow({id:'h',name:'운동',label:'쉬는 날',checked:false,rest:true,day:'2026-11-22'});
assert.match(restRow,/aria-disabled="true"/);assert.doesNotMatch(restRow,/data-habit-toggle/,'rest-day habits cannot be toggled');
assert.match(Views.calendarHabitRow({id:'h',name:'운동',label:'매일',checked:true,rest:false,day:'2026-11-20'}),/data-habit-toggle="h"[^>]*aria-pressed="true"/);
assert.match(migration,/events_color_key_check/);

console.log('calendar contract: PASS');
