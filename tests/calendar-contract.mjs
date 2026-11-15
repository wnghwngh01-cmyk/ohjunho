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
const calendarCss=fs.readFileSync(new URL('../assets/calendar-stitch.css',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/step9_calendar_upgrade.sql',import.meta.url),'utf8');
assert.match(html,/name="eventColor"/);
assert.match(html,/calendar-utils\.js/);
assert.match(html,/id="page-calendar" class="page wide stitch-calendar"/,'calendar should use the final Stitch canvas');
assert.doesNotMatch(html,/id="page-calendar"[^]*?<p class="eyebrow">TIME MANAGEMENT<\/p>/,'legacy calendar page heading must be removed');
assert.match(html,/id="calendarMonth"/);
assert.match(html,/id="selectedEventCount"/);
assert.match(html,/id="selectedHabitSubDate"/);
assert.match(html,/id="habitWeekdayPicker"[^]*?value="0"[^]*?value="6"/,'weekday picker should be present once in the document');
assert.equal((html.match(/id="habitWeekdayPicker"/g)||[]).length,1,'weekday picker id must not be duplicated');
assert.match(html,/calendar-stitch\.css\?v=/);
assert.match(db,/color_key:eventColor\(colorKey\)/);
assert.match(app,/Cal\.buildEventLayout\(calendarItems,gridStart,42,2\)/);
assert.match(app,/Cal\.habitRunsOn\(day,h,state\.habitChecks,\{includeBeforeStart:day<DB\.today\(\)\}\)/,'past calendar details should show applicable checklist items even before their creation date');
assert.doesNotMatch(app,/목표를 넘겨도 계속 체크할 수 있어요/,'weekly habits must stop appearing after the target is reached');
assert.match(app,/class="day calendar-cell/,'each rendered date should retain the Stitch calendar-cell contract');
assert.match(app,/class="day-top"[^]*?class="day-more">\+\$\{cell\.hidden\}/,'overflow count should stay beside the date instead of consuming an event lane');
assert.match(app,/class="event-actions-inline"/,'calendar event actions should be inline chips');
assert.doesNotMatch(app,/action-menu event-actions/,'legacy ellipsis event menu must be removed');
assert.doesNotMatch(app,/insertAdjacentHTML\('afterend','<fieldset id="habitWeekdayPicker"/,'weekday picker must not be inserted a second time');
assert.match(calendarCss,/\.calendar-grid\s*\{[^}]*grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\);[^}]*border-top:\s*1px solid #efeeeb;/,'calendar must use the Stitch 7-column grid');
assert.match(calendarCss,/\.calendar-cell,[^}]*min-height:\s*84px;[^}]*padding:\s*6px 4px 4px;/,'date cells should preserve Stitch dimensions');
assert.match(calendarCss,/\.day-habit-status\s*\{[^}]*width:\s*12px;[^}]*height:\s*12px;[^}]*top:\s*8px;[^}]*right:\s*5px;/,'habit status should use a fixed top-right slot');
assert.match(calendarCss,/\.day-habit-status\.pending\s*\{\s*width:\s*6px;\s*height:\s*6px;\s*background:\s*#5f786b;\s*border:\s*0;\s*border-radius:\s*50%;\s*box-shadow:\s*none;/,'pending state should be a plain dot without a white ring');
assert.match(calendarCss,/\.day-habit-status\.complete\s*\{\s*width:\s*12px;\s*height:\s*12px;\s*color:\s*#4f7562;\s*background:\s*transparent;\s*border:\s*0;\s*border-radius:\s*0;\s*box-shadow:\s*none;/,'complete state should be a standalone check without a surrounding circle');
assert.match(app,/class="habit-check-icon"/,'completed calendar habits should render a check icon');
assert.match(calendarCss,/button\.day\.today \.day-number\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;[^}]*background:\s*#1e3a2f;/,'today marker should match the 20px forest circle');
assert.match(calendarCss,/\.day-event\.color-forest\s*\{\s*background-color:\s*#ebf3ee;\s*color:\s*#3b5b4b;\s*border:\s*none;/);
assert.match(calendarCss,/\.day-event\.range-start\s*\{[^}]*margin-right:\s*-5px;[^}]*border-radius:\s*4px 0 0 4px;/);
assert.match(calendarCss,/\.day-event\.range-mid\s*\{[^}]*margin-left:\s*-5px;[^}]*margin-right:\s*-5px;[^}]*border-radius:\s*0;/);
assert.match(calendarCss,/\.day-event\.range-end\s*\{[^}]*margin-left:\s*-5px;[^}]*border-radius:\s*0 4px 4px 0;/);
assert.match(calendarCss,/\.event-actions-inline\s*\{[^}]*display:\s*flex/,'event actions should remain in one inline group');
assert.match(app,/\$\('#calPrevMobile'\)\?\.addEventListener/,'removed mobile navigation compatibility binding must be null-safe');
assert.match(migration,/events_color_key_check/);

console.log('calendar contract: PASS');
