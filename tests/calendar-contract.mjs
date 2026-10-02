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
const lightTheme=fs.readFileSync(new URL('../assets/light-theme.css',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step9_calendar_upgrade.sql',import.meta.url),'utf8');
assert.match(html,/name="eventColor"/);
assert.match(html,/calendar-utils\.js/);
assert.match(db,/color_key:eventColor\(colorKey\)/);
assert.match(app,/Cal\.buildEventLayout\(calendarItems,gridStart,42,2\)/);
assert.match(app,/Cal\.habitRunsOn\(day,h,state\.habitChecks,\{includeBeforeStart:day<DB\.today\(\)\}\)/,'past calendar details should show applicable checklist items even before their creation date');
assert.doesNotMatch(app,/목표를 넘겨도 계속 체크할 수 있어요/,'weekly habits must stop appearing after the target is reached');
assert.match(lightTheme,/\.day-number\{position:absolute;top:5px;left:5px;/,'calendar dates should stay in the top-left corner');
assert.match(lightTheme,/\.day-habit-status\{top:8px;right:5px;bottom:auto;left:auto;[^}]*width:12px;height:12px/,'habit status should use a fixed top-right slot');
assert.match(lightTheme,/\.day-habit-status\.pending\{width:6px;height:6px;background:#5f786b;border:0;border-radius:50%;box-shadow:none\}/,'pending state should be a plain dot without a white ring');
assert.match(lightTheme,/\.day-habit-status\.complete\{width:12px;height:12px;color:#4f7562;background:transparent;border:0;border-radius:0;box-shadow:none\}/,'complete state should be a standalone check without a surrounding circle');
assert.match(app,/class="habit-check-icon"/,'completed calendar habits should render a check icon');
assert.match(lightTheme,/@media\(max-width:760px\)\{[^]*\.day-number\{top:4px;left:3px;width:20px;height:20px;font-size:12px\}/,'mobile today marker should stay compact enough for narrow calendar cells');
assert.match(migration,/events_color_key_check/);

console.log('calendar contract: PASS');
