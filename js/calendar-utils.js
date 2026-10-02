(function(global){
  'use strict';

  const COLOR_KEYS=['forest','sage','blue','amber','rose','violet'];
  const HOLIDAYS={
    2025:{
      '2025-01-01':'신정','2025-01-27':'임시공휴일','2025-01-28':'설날 연휴','2025-01-29':'설날','2025-01-30':'설날 연휴',
      '2025-03-01':'삼일절','2025-03-03':'대체공휴일','2025-05-05':'어린이날 · 부처님오신날','2025-05-06':'대체공휴일',
      '2025-06-03':'대통령선거일','2025-06-06':'현충일','2025-08-15':'광복절','2025-10-03':'개천절',
      '2025-10-05':'추석 연휴','2025-10-06':'추석','2025-10-07':'추석 연휴','2025-10-08':'대체공휴일','2025-10-09':'한글날','2025-12-25':'성탄절'
    },
    2026:{
      '2026-01-01':'신정','2026-02-16':'설날 연휴','2026-02-17':'설날','2026-02-18':'설날 연휴',
      '2026-03-01':'삼일절','2026-03-02':'대체공휴일','2026-05-01':'노동절','2026-05-05':'어린이날',
      '2026-05-24':'부처님오신날','2026-05-25':'대체공휴일','2026-06-03':'지방선거일','2026-06-06':'현충일',
      '2026-07-17':'제헌절','2026-08-15':'광복절','2026-08-17':'대체공휴일','2026-09-24':'추석 연휴',
      '2026-09-25':'추석','2026-09-26':'추석 연휴','2026-10-03':'개천절','2026-10-05':'대체공휴일',
      '2026-10-09':'한글날','2026-12-25':'성탄절'
    },
    2027:{
      '2027-01-01':'신정','2027-02-06':'설날 연휴','2027-02-07':'설날','2027-02-08':'설날 연휴','2027-02-09':'대체공휴일',
      '2027-03-01':'삼일절','2027-05-01':'노동절','2027-05-03':'대체공휴일','2027-05-05':'어린이날','2027-05-13':'부처님오신날',
      '2027-06-06':'현충일','2027-07-17':'제헌절','2027-07-19':'대체공휴일','2027-08-15':'광복절','2027-08-16':'대체공휴일',
      '2027-09-14':'추석 연휴','2027-09-15':'추석','2027-09-16':'추석 연휴','2027-10-03':'개천절','2027-10-04':'대체공휴일',
      '2027-10-09':'한글날','2027-10-11':'대체공휴일','2027-12-25':'성탄절','2027-12-27':'대체공휴일'
    }
  };

  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const shiftDay=(key,amount)=>{const d=new Date(`${key}T12:00:00`);d.setDate(d.getDate()+amount);return dateKey(d)};
  const sanitizeColor=value=>COLOR_KEYS.includes(value)?value:'forest';
  const holidayFor=key=>HOLIDAYS[Number(String(key).slice(0,4))]?.[key]||null;
  const habitStartDay=habit=>{
    if(habit?.schedule?.start_date)return habit.schedule.start_date;
    if(!habit?.created_at)return'0000-01-01';
    const d=new Date(habit.created_at);
    return Number.isNaN(d.getTime())?String(habit.created_at).slice(0,10):dateKey(d);
  };

  function fixedHabitRunsOn(day,schedule){
    const s=schedule||{type:'daily'};
    if(s.type==='weekly_n')return false;
    if(s.type==='daily')return true;
    const dow=new Date(`${day}T12:00:00`).getDay();
    if(s.type==='weekdays')return dow>=1&&dow<=5;
    if(s.type==='selected_weekdays')return (s.days||[]).map(Number).includes(dow);
    return true;
  }

  function weekBounds(day){
    const d=new Date(`${day}T12:00:00`),monday=new Date(d);
    monday.setDate(d.getDate()-((d.getDay()+6)%7));
    return [dateKey(monday),shiftDay(dateKey(monday),6)];
  }

  function weeklyProgress(habit,day,checks,throughDay=null){
    const [start,end]=weekBounds(day);
    const through=throughDay&&throughDay<end?throughDay:end;
    const completed=(checks||[]).filter(c=>c.habit_id===habit.id&&c.completed&&c.day>=start&&c.day<=through).length;
    return{completed,target:Math.max(1,Number(habit.schedule?.count)||1)};
  }

  function habitRunsOn(day,habit,checks=[],options={}){
    if(!options.includeBeforeStart&&day<habitStartDay(habit))return false;
    if(habit.schedule?.type!=='weekly_n')return fixedHabitRunsOn(day,habit.schedule);
    const checked=(checks||[]).some(c=>c.habit_id===habit.id&&c.day===day&&c.completed);
    if(checked)return true;
    const before=weeklyProgress(habit,day,checks,shiftDay(day,-1));
    return before.completed<before.target;
  }

  function habitMarker(day,habits,checks,today=dateKey(new Date())){
    if(day>today)return'';
    const checkMap=new Map((checks||[]).filter(c=>c.day===day).map(c=>[c.habit_id,!!c.completed]));
    const due=(habits||[]).filter(h=>habitRunsOn(day,h,checks,{includeBeforeStart:day<today}));
    if(!due.length)return'';
    if(due.every(h=>checkMap.get(h.id)))return'complete';
    return day===today?'pending':'';
  }

  function holidayEvents(gridStart,dayCount=42){
    const rows=[];
    for(let i=0;i<dayCount;i++){
      const day=shiftDay(gridStart,i),name=holidayFor(day);
      if(name)rows.push({id:`holiday:${day}`,name,start_date:day,end_date:day,color_key:'rose',system:true,holiday:true});
    }
    return rows;
  }

  function eventDuration(event){
    return Math.round((new Date(`${event.end_date}T12:00:00`)-new Date(`${event.start_date}T12:00:00`))/86400000)+1;
  }

  function buildEventLayout(events,gridStart,dayCount=42,maxVisible=2){
    const cells=new Map();
    for(let i=0;i<dayCount;i++)cells.set(shiftDay(gridStart,i),{slots:Array(maxVisible).fill(null),hidden:0});
    for(let week=0;week<dayCount;week+=7){
      const weekStart=shiftDay(gridStart,week),weekEnd=shiftDay(weekStart,6),laneEnds=[];
      const inWeek=(events||[]).filter(e=>e.start_date<=weekEnd&&e.end_date>=weekStart).sort((a,b)=>
        eventDuration(b)-eventDuration(a)||String(a.start_date).localeCompare(String(b.start_date))||String(a.id||a.name).localeCompare(String(b.id||b.name))
      );
      for(const event of inWeek){
        const segmentStart=event.start_date<weekStart?weekStart:event.start_date;
        const segmentEnd=event.end_date>weekEnd?weekEnd:event.end_date;
        let lane=laneEnds.findIndex(end=>end<segmentStart);
        if(lane<0)lane=laneEnds.length;
        laneEnds[lane]=segmentEnd;
        for(let key=segmentStart;key<=segmentEnd;key=shiftDay(key,1)){
          const cell=cells.get(key);if(!cell)continue;
          if(lane<maxVisible)cell.slots[lane]={event,start:key===segmentStart,end:key===segmentEnd};
          else cell.hidden+=1;
        }
      }
    }
    return cells;
  }

  global.HaruCalendar={COLOR_KEYS,HOLIDAYS,sanitizeColor,holidayFor,holidayEvents,fixedHabitRunsOn,habitStartDay,weekBounds,weeklyProgress,habitRunsOn,habitMarker,buildEventLayout,shiftDay};
})(typeof window!=='undefined'?window:globalThis);
