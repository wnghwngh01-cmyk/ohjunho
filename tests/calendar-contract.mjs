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
assert.match(app,/\.slots\|\|\[\]\)\.filter\(Boolean\)\.slice\(0,2\)/,'calendar cells should render exactly two real event badges without blank lane spacers');
assert.match(app,/class="day-events">\$\{eventHtml\}\$\{cell\?\.hidden\?`<div class="day-more">\+\$\{cell\.hidden\}개<\/div>`/,'overflow count should render below the two event badges');
assert.match(app,/class="event-actions-inline"/,'calendar event actions should be inline chips');
assert.doesNotMatch(app,/action-menu event-actions/,'legacy ellipsis event menu must be removed');
assert.doesNotMatch(app,/segment-\$\{span\}|range-start|range-mid|range-end/,'calendar event badges must remain inside each date cell without spanning margins');
assert.doesNotMatch(app,/insertAdjacentHTML\('afterend','<fieldset id="habitWeekdayPicker"/,'weekday picker must not be inserted a second time');
assert.match(calendarCss,/\.app-main:has\(#page-calendar\.active\) > \.topbar,[^}]*display:\s*none !important/,'calendar route must hide the global topbar');
assert.match(calendarCss,/#page-calendar details > summary::after,[^}]*content:\s*none !important;[^}]*display:\s*none !important;/,'legacy module-add plus/minus markers must be removed');
assert.match(calendarCss,/\.calendar-grid\s*\{[^}]*grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\) !important;[^}]*gap:\s*1px !important;[^}]*background:\s*#f0efea !important;/,'calendar must use the final Stitch separated-cell grid');
assert.match(calendarCss,/button\.day\.calendar-cell\s*\{[^}]*min-height:\s*76px !important;[^}]*height:\s*auto !important;[^}]*padding:\s*4px !important;[^}]*overflow:\s*hidden !important;/,'date cells should preserve the final Stitch dimensions and containment');
assert.match(calendarCss,/\.day-habit-status\.pending\s*\{[^}]*width:\s*6px !important;[^}]*height:\s*6px !important;[^}]*background:\s*#1e3a2f !important;/,'pending state should be a forest dot');
assert.match(calendarCss,/\.day-habit-status\.complete\s*\{[^}]*color:\s*#1e3a2f !important;[^}]*background:\s*transparent !important;/,'complete state should be a standalone forest check');
assert.match(calendarCss,/\.day-habit-status\.complete::after\s*\{[^}]*border-width:\s*0 2px 2px 0 !important;[^}]*rotate\(45deg\)/,'completed calendar habits should render a CSS check that cannot be lost by SVG styling');
assert.match(app,/class="calendar-check-glyph"[^>]*>✓<\/span>/,'completed event and habit controls should contain a visible check glyph');
assert.match(calendarCss,/\.calendar-check-glyph\s*\{[^}]*color:\s*#fff !important;[^}]*font-size:\s*12px !important;/,'completed event and habit controls should style the check glyph clearly');
assert.match(calendarCss,/\.mini-item:has\(\.check\.done\) strong\s*\{[^}]*text-decoration:\s*line-through !important;/,'completed checklist labels should use a strikethrough');
assert.match(calendarCss,/button\.day\.calendar-cell\s*\{[^}]*justify-content:\s*flex-start !important;/,'event badges should stay directly below the date instead of dropping to the bottom');
assert.match(calendarCss,/\.day-events\s*\{[^}]*flex:\s*0 0 auto !important;/,'event badge rows should not stretch vertically');
assert.match(calendarCss,/button\.day\.today \.day-number\s*\{[^}]*width:\s*18px !important;[^}]*height:\s*18px !important;[^}]*background:\s*#1e3a2f !important;/,'today marker should match the 18px forest circle');
assert.match(calendarCss,/\.day-event\.color-forest\s*\{\s*color:\s*#1e3a2f !important;\s*background:\s*#ebf7f0 !important;/);
assert.match(calendarCss,/\.day-event\.color-amber\s*\{\s*color:\s*#b86b19 !important;\s*background:\s*#fef6ec !important;/);
assert.match(calendarCss,/\.day-event\.range-start,[^}]*margin:\s*0 !important;/,'legacy range classes must be neutralized even if stale markup appears');
assert.match(calendarCss,/\.day-more\s*\{[^}]*position:\s*static !important;/,'overflow count should sit below event badges');
assert.match(calendarCss,/\.day-more\s*\{[^}]*color:\s*#78756f !important;[^}]*font-size:\s*9px !important;/,'overflow count should match the final Stitch typography');
assert.match(calendarCss,/\.event-actions-inline\s*\{[^}]*display:\s*flex/,'event actions should remain in one inline group');
assert.match(app,/\$\('#calPrevMobile'\)\?\.addEventListener/,'removed mobile navigation compatibility binding must be null-safe');
assert.match(migration,/events_color_key_check/);

console.log('calendar contract: PASS');
