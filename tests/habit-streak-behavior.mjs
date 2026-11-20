import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Habit rules decided on 2026-11-20: streak with 🔥 from 7 days, "오늘은 쉬는 날" with a disabled checkbox,
// and the calendar check appears once every habit due that day is checked (rest-day and 주 N회 habits never block it).
const load=file=>{const context={globalThis:{}};vm.runInNewContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),context);return context.globalThis};
const Cal=load('js/calendar-utils.js').HaruCalendar;
const Views=load('js/stitch-views.js').HaruStitchViews;
const check=(habit_id,...days)=>days.map(day=>({habit_id,day,completed:true}));
const TODAY='2026-11-20'; // Friday

const daily={id:'daily',schedule:{type:'daily',start_date:'2026-11-01'}};
const mwf={id:'mwf',schedule:{type:'selected_weekdays',days:[1,3,5],start_date:'2026-11-01'}};
const weekdays={id:'weekdays',schedule:{type:'weekdays',start_date:'2026-11-01'}};
const weekly={id:'weekly',schedule:{type:'weekly_n',count:3,start_date:'2026-11-01'}};

// Streaks
const sevenDays=check('daily','2026-11-13','2026-11-14','2026-11-15','2026-11-16','2026-11-17','2026-11-18','2026-11-19');
assert.equal(Cal.habitStreak(daily,sevenDays,TODAY),7,'an unchecked today keeps the streak through yesterday');
assert.equal(Cal.habitStreak(daily,[...sevenDays,...check('daily',TODAY)],TODAY),8,'checking today extends the streak');
assert.equal(Cal.habitStreak(daily,check('daily','2026-11-18'),TODAY),0,'a missed scheduled day breaks the streak');
assert.equal(Cal.habitStreak(mwf,check('mwf','2026-11-09','2026-11-11','2026-11-13','2026-11-16','2026-11-18'),TODAY),5,'rest days are skipped, not counted as misses');
assert.equal(Cal.habitStreak(weekly,check('weekly','2026-11-19','2026-11-18'),TODAY),0,'주 N회 habits show weekly progress instead of a streak');
assert.equal(Cal.habitStreak({id:'new',schedule:{type:'daily',start_date:'2026-11-19'}},check('new','2026-11-19',TODAY),TODAY),2,'a streak never counts days before the start date');

// Rest days
assert.equal(Cal.isHabitRestDay('2026-11-21',mwf),true,'Saturday is a rest day for 월·수·금');
assert.equal(Cal.isHabitRestDay(TODAY,mwf),false);
assert.equal(Cal.isHabitRestDay('2026-11-21',weekdays),true);
assert.equal(Cal.isHabitRestDay('2026-11-21',daily),false);
assert.equal(Cal.isHabitRestDay('2026-11-21',weekly),false,'주 N회 habits never rest');
assert.equal(Cal.isHabitRestDay('2026-10-30',daily),true,'days before the start date rest by default');
assert.equal(Cal.isHabitRestDay('2026-10-30',daily,{includeBeforeStart:true}),false,'past calendar days still allow retroactive checks');

// Calendar check
const habits=[daily,mwf,weekly];
assert.equal(Cal.habitDayStatus('2026-11-21',habits,check('daily','2026-11-21'),'2026-11-21'),'complete','checking the due habit is enough on a rest day of the others');
assert.equal(Cal.habitDayStatus(TODAY,habits,check('daily',TODAY),TODAY),'partial','one of two due habits checked');
assert.equal(Cal.habitDayStatus(TODAY,habits,[...check('daily',TODAY),...check('mwf',TODAY)],TODAY),'complete','an unchecked 주 N회 habit does not block the check');
assert.equal(Cal.habitDayStatus(TODAY,habits,[],TODAY),'','nothing checked shows nothing');
assert.equal(Cal.habitDayStatus('2026-11-21',habits,check('daily','2026-11-21'),TODAY),'','future days show nothing');
assert.equal(Cal.habitDayStatus('2026-11-21',[mwf,weekly],check('weekly','2026-11-21'),'2026-11-21'),'complete','with only 주 N회 due, a check on it completes the day');
assert.equal(Cal.habitDayStatus('2026-11-21',[mwf],[],'2026-11-21'),'','a day where every habit rests shows nothing');

// Week dots (Mon..Sun)
assert.deepEqual([...Cal.weekDots(daily,check('daily','2026-11-16','2026-11-17','2026-11-18','2026-11-19'),TODAY)],['done','done','done','done','today','','']);
assert.deepEqual([...Cal.weekDots(daily,check('daily','2026-11-16',TODAY),TODAY)],['done','','','','done','','']);

// Today labels
assert.match(Views.habitStat({streak:7,type:'daily'}),/7일 연속 🔥/,'🔥 from 7 days');
assert.doesNotMatch(Views.habitStat({streak:6,type:'daily'}),/🔥/,'no 🔥 below 7 days');
assert.match(Views.habitStat({streak:6,type:'daily'}),/6일 연속/);
assert.equal(Views.habitStat({streak:0,type:'daily'}),'');
assert.match(Views.habitStat({rest:true,streak:9,type:'selected_weekdays'}),/오늘은 쉬는 날/);
assert.match(Views.habitStat({type:'weekly_n',progress:{completed:2,target:3}}),/2\/3일 달성/);
const restRow=Views.todayHabitRow({id:'mwf',name:'운동',schedule:mwf.schedule,checked:false,rest:true,streak:3,dots:['','','','','','today',''],day:'2026-11-21'});
assert.match(restRow,/<button type="button" disabled aria-disabled="true"/,'rest-day checkbox is disabled');
assert.doesNotMatch(restRow,/data-habit-toggle/,'rest-day checkbox cannot toggle');
assert.match(restRow,/오늘은 쉬는 날/);
assert.match(restRow,/월 · 수 · 금/,'selected weekdays badge lists Monday first');
const activeRow=Views.todayHabitRow({id:'daily',name:'물 마시기',schedule:daily.schedule,checked:true,rest:false,streak:12,dots:['done','done','done','done','done','',''],day:TODAY});
assert.match(activeRow,/data-habit-toggle="daily" data-day="2026-11-20"/);
assert.match(activeRow,/12일 연속 🔥/);
assert.equal((activeRow.match(/w-1\.5 h-1\.5 rounded-full/g)||[]).length,7,'seven week dots');
assert.doesNotMatch(activeRow+restRow,/style=/,'templates must not use style attributes');

console.log('habit streak behavior: PASS (streak, 🔥≥7, rest days, calendar check, week dots)');
