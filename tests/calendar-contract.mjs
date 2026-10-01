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
const crowded=Cal.buildEventLayout(sameDay,'2026-10-11',7,3).get('2026-10-14');
assert.equal(crowded.slots.filter(Boolean).length,3,'three events should remain visible');
assert.equal(crowded.hidden,1,'the fourth event should be represented by +1');

const ranged=Cal.buildEventLayout([
  {id:'long',name:'긴 일정',start_date:'2026-10-12',end_date:'2026-10-15'},
  {id:'short',name:'짧은 일정',start_date:'2026-10-13',end_date:'2026-10-14'}
],'2026-10-11',7,3);
assert.equal(ranged.get('2026-10-12').slots[0].event.id,'long');
assert.equal(ranged.get('2026-10-15').slots[0].event.id,'long','multi-day event should keep its lane for the week');
assert.equal(ranged.get('2026-10-13').slots[1].event.id,'short');

const habits=[
  {id:'daily',schedule:{type:'daily'}},
  {id:'flex',schedule:{type:'weekly_n',count:2}}
];
assert.equal(Cal.habitMarker('2026-10-14',habits,[]),'pending','an unchecked fixed habit should show a dot before any check exists');
assert.equal(Cal.habitMarker('2026-10-14',habits,[{habit_id:'daily',day:'2026-10-14',completed:true}]),'complete');
assert.equal(Cal.habitMarker('2026-10-15',[habits[1]],[{habit_id:'flex',day:'2026-10-15',completed:true}]),'complete','a flexible weekly habit only marks the day it was checked');
const progress=Cal.weeklyProgress(habits[1],'2026-10-15',[
  {habit_id:'flex',day:'2026-10-12',completed:true},
  {habit_id:'flex',day:'2026-10-13',completed:true},
  {habit_id:'flex',day:'2026-10-15',completed:true}
]);
assert.deepEqual({...progress},{completed:3,target:2},'weekly target should allow progress beyond the target');

assert.equal(Cal.holidayFor('2026-09-25'),'추석');
assert.equal(Cal.holidayFor('2027-07-17'),'제헌절');

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step9_calendar_upgrade.sql',import.meta.url),'utf8');
assert.match(html,/name="eventColor"/);
assert.match(html,/calendar-utils\.js/);
assert.match(db,/color_key:eventColor\(colorKey\)/);
assert.match(app,/Cal\.buildEventLayout\(state\.calendarEvents,gridStart,42,3\)/);
assert.doesNotMatch(app,/이번 주에는 이미 .*회 완료했습니다/,'weekly habits must not be capped');
assert.match(migration,/events_color_key_check/);

console.log('calendar contract: PASS');
