'use strict';
/* Android home-widget snapshot and pinning bridge. The web app remains the source of truth. */
(function(global){
  const native=()=>!!global.Capacitor?.isNativePlatform?.(),plugin=()=>global.Capacitor?.Plugins?.HaruWidget;
  let timer=0,running=false,queued=false;
  const targetFor=habit=>{const type=habit.schedule?.type||'daily';return type==='weekly_n'?Math.max(1,Math.min(7,Number(habit.schedule?.count)||1)):type==='weekdays'?5:type==='selected_weekdays'?Math.max(1,new Set((habit.schedule?.days||[]).map(Number)).size):7};
  const fmtDay=day=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date(`${day}T12:00:00`));
  const eventMeta=row=>row.start_date===row.end_date?'':`${String(row.start_date||'').slice(5).replace('-','.')} ~ ${String(row.end_date||'').slice(5).replace('-','.')}`;
  async function flushPending(session){const api=plugin(),result=await api.pending(),writes=Array.isArray(result?.writes)?result.writes:[];for(const write of writes){try{const response=await fetch(`${global.LAB_CONFIG.SUPABASE_URL}/rest/v1/${write.path}`,{method:write.method,headers:{apikey:global.LAB_CONFIG.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',Prefer:write.prefer||'return=minimal'},body:JSON.stringify(write.body||{})});if(response.ok)await api.completePending({id:write.id})}catch{}}}
  async function snapshot(seed){
    const DB=global.LabDB,Cal=global.HaruCalendar,Finance=global.HaruFinance,cfg=global.LAB_CONFIG,user=DB?.user?.();if(!native()||!plugin()||!user)return null;
    const day=DB.today(),month=day.slice(0,7),[weekStart]=Cal.weekBounds(day),session=await DB.getSession();await flushPending(session);
    const base=seed||{},[data,countdowns,todos,weekChecks,protein,budget,finance]=await Promise.all([
      base.data||DB.dashboard(day),base.countdowns||DB.listImportantEvents(day),base.todos||DB.listTodos(day),base.weekChecks||DB.checksForRange(weekStart,day),DB.listProtein(day),DB.getMonthBudget(month),DB.listFinance()
    ]);
    const checkMap=new Map(data.checks.map(row=>[row.habit_id,!!row.completed])),budgetSummary=Finance.budgetSummary(finance,month,budget.items||{}),themeSetting=localStorage.getItem(`lab:theme:${user.id}`)||'system';
    const theme=themeSetting==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):themeSetting;
    const nearest=countdowns[0],days=nearest?Math.ceil((new Date(`${nearest.start_date}T12:00:00`)-new Date(`${day}T12:00:00`))/86400000):null;
    return{day,dateLabel:fmtDay(day),theme,userId:user.id,accessToken:session?.access_token||'',supabaseUrl:cfg.SUPABASE_URL,supabaseKey:cfg.SUPABASE_PUBLISHABLE_KEY,
      proteinTotal:protein.reduce((sum,row)=>sum+Number(row.grams||0),0),budget:budgetSummary,
      dday:nearest?`${days===0?'D-DAY':`D-${days}`} ${nearest.name}`:'',
      events:data.events.slice(0,3).map(row=>({id:row.id,name:row.name,done:!!row.done,meta:eventMeta(row)})),
      todos:todos.slice(0,3).map(row=>({id:row.id,title:row.title,completed:!!row.completed})),
      habits:data.habits.filter(h=>Cal.habitRunsOn(day,h,weekChecks)).slice(0,3).map(h=>({id:h.id,title:h.name,completed:!!checkMap.get(h.id),weekCompleted:weekChecks.filter(c=>c.habit_id===h.id&&c.completed).length,weekTarget:targetFor(h)}))};
  }
  async function sync(seed){if(running){queued=true;return}running=true;try{const value=await snapshot(seed);if(value)await plugin().sync({snapshot:value})}catch(error){console.warn('Android 위젯 동기화 실패',error)}finally{running=false;if(queued){queued=false;schedule()}}}
  function schedule(seed){clearTimeout(timer);timer=setTimeout(()=>void sync(seed),250)}
  async function requestPin(type){if(!native()||!plugin())return{supported:false,requested:false};return plugin().requestPin({type})}
  global.HaruWidgetBridge={sync,schedule,requestPin,available:native};
})(window);
