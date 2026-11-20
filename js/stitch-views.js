'use strict';
/*
 * Markup templates copied from the final Stitch files (2026-11-20):
 *   Calendar = Stitch "calendar.html" render template (CalendarRenderer.renderApp)
 *   Today    = Stitch "1_1" static screen
 * Classes and structure are kept as Stitch wrote them; only real data and app hooks (data-* / aria) are added.
 * User decisions: no "다음 날" button, event subtitle = date only, Today events keep their checkbox,
 * habits show streaks (🔥 from 7 days) and "오늘은 쉬는 날" with a disabled checkbox.
 * The Tailwind builds for #page-calendar / #page-today scan this file, so every class used here is generated.
 */
(function(global){
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const CHECK_SVG_CAL='<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
  // Stitch EVENT_COLORS (mint / coral / steel / amber). App color keys map onto these four styles.
  const EVENT_COLORS={
    mint:{bg:'bg-[#EBF7F0]',text:'text-[#1E3A2F]'},
    coral:{bg:'bg-[#FDF0EE]',text:'text-[#B45650]'},
    steel:{bg:'bg-[#EDF3F8]',text:'text-[#4E70A0]'},
    amber:{bg:'bg-[#FEF6EC]',text:'text-[#C97A1E]'}
  };
  const COLOR_STYLE={forest:'mint',sage:'mint',blue:'steel',violet:'steel',amber:'amber',rose:'coral'};
  const eventStyle=key=>EVENT_COLORS[COLOR_STYLE[key]||'mint'];
  const shortDate=key=>{const [,m,d]=String(key).split('-').map(Number);return`${m}.${d}`};
  const dateRange=e=>e.end_date&&e.end_date!==e.start_date?`${shortDate(e.start_date)} ~ ${shortDate(e.end_date)}`:shortDate(e.start_date);

  /* ---------- Calendar ---------- */
  function calendarCell({day,dayNum,col,isCurr,isSel,slots=[],hidden=0,status=''}){
    // Stitch used style="color:…"; the app CSP (style-src 'self') blocks style attributes, so the same colors are classes.
    const colr=isCurr?(col===0?'text-[#B45650]':(col===6?'text-[#4E70A0]':'text-[#2C2D2B]')):'text-[#BFBCB5]';
    const marker=status==='complete'
      ?'<svg class="w-3 h-3 text-[#1E3A2F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-label="체크리스트 완료"><polyline points="20 6 9 17 4 12"/></svg>'
      :status==='partial'?'<span class="w-1.5 h-1.5 rounded-full bg-[#1E3A2F]" aria-label="체크리스트 일부 완료"></span>':'';
    const badges=slots.slice(0,2).map(e=>{const s=eventStyle(e.color_key);return`<div class="truncate text-[9.5px] px-1 py-0.5 rounded ${s.bg} ${s.text} font-medium leading-tight">${e.important?'<span class="text-amber-500 mr-0.5">★</span>':''}${esc(e.name)}</div>`}).join('');
    return`<div data-select-day="${day}" role="button" tabindex="0" aria-label="${esc(day)}" class="min-h-[76px] p-1 bg-white flex flex-col justify-between cursor-pointer hover:bg-[#FAF9F5] transition-colors ${isSel?'ring-2 ring-inset ring-[#1E3A2F]':''}"><div class="flex items-center justify-between leading-none mb-0.5"><span class="text-[11px] font-medium px-0.5 ${colr}">${dayNum}</span>${marker}</div><div class="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">${badges}${hidden>0?`<div class="text-[9px] font-semibold text-[#78756F] px-1 leading-tight">+${hidden}개</div>`:''}</div></div>`;
  }

  function calendarEventRow(e){
    if(e.system)return`<div class="flex items-center justify-between p-2.5 rounded-xl border border-[#F4F3F0] bg-[#FAF9F7] transition-all"><div class="flex items-center gap-2.5 flex-1 min-w-0 mr-2"><div class="min-w-0"><div class="flex items-center gap-1"><span class="text-xs font-semibold truncate text-[#B45650]">${esc(e.name)}</span></div><div class="text-[10.5px] text-[#888]">${dateRange(e)} · 대한민국 공휴일</div></div></div></div>`;
    return`<div class="flex items-center justify-between p-2.5 rounded-xl border border-[#F4F3F0] bg-[#FAF9F7] transition-all"><div class="flex items-center gap-2.5 flex-1 min-w-0 mr-2"><button type="button" data-event-toggle="${esc(e.id)}" data-done="${!!e.done}" aria-label="${esc(e.name)} 완료 체크" class="w-4 h-4 rounded border flex items-center justify-center transition-colors ${e.done?'bg-[#1E3A2F] border-[#1E3A2F] text-white':'bg-white border-[#D6D3CC]'}">${e.done?CHECK_SVG_CAL:''}</button><div class="min-w-0"><div class="flex items-center gap-1">${e.important?'<span class="text-amber-500 text-xs">★</span>':''}<span class="text-xs font-semibold truncate ${e.done?'line-through text-[#999]':'text-[#1C1D1B]'}">${esc(e.name)}</span></div><div class="text-[10.5px] text-[#888]">${dateRange(e)}</div></div></div><div class="flex items-center gap-1 shrink-0"><button type="button" data-edit-event="${esc(e.id)}" class="px-2.5 py-1 text-[11px] rounded bg-white border border-[#E5E3DE] text-[#444] hover:bg-[#F4F3F0] transition-colors">수정</button><button type="button" data-delete-event="${esc(e.id)}" aria-label="${esc(e.name)} 삭제" class="px-2.5 py-1 text-[11px] rounded bg-white border border-[#FAD4D1] text-[#B45650] hover:bg-[#FDF0EE] transition-colors">삭제</button></div></div>`;
  }
  const calendarEventsEmpty=()=>'<div class="py-6 text-center text-xs text-[#999]">등록된 일정이 없습니다.</div>';

  // Whole row toggles (Stitch); rest-day habits are shown but cannot be toggled.
  function calendarHabitRow({id,name,label,checked,rest,day}){
    const box=`<span class="w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked?'bg-[#1E3A2F] border-[#1E3A2F] text-white':'bg-white border-[#D6D3CC]'}">${checked?CHECK_SVG_CAL:''}</span>`;
    const body=`<div class="flex-1 min-w-0"><div class="text-xs font-semibold text-[#1C1D1B]">${esc(name)}</div><div class="text-[10.5px] text-[#888]">${esc(label)}</div></div>`;
    if(rest)return`<div aria-disabled="true" class="flex items-center gap-3 p-3 rounded-xl border border-[#F4F3F0] bg-[#FAF9F7] cursor-default opacity-60 transition-all">${box}${body}</div>`;
    return`<div data-habit-toggle="${esc(id)}" data-day="${esc(day)}" role="button" tabindex="0" aria-pressed="${!!checked}" aria-label="${esc(name)} 체크" class="flex items-center gap-3 p-3 rounded-xl border border-[#F4F3F0] bg-[#FAF9F7] cursor-pointer hover:bg-[#F5F4EF] transition-all">${box}${body}</div>`;
  }
  const calendarHabitsEmpty=()=>'<div class="py-6 text-center text-xs text-[#999]">설정한 체크리스트가 없습니다.</div>';

  function calendarHabitSettingRow({id,name,label}){
    return`<div class="flex items-center justify-between py-1 px-2 rounded bg-white text-xs border border-[#E5E3DE]"><span class="truncate">${esc(name)} <span class="text-[10.5px] text-[#888]">· ${esc(label)}</span></span><span class="flex items-center shrink-0"><button type="button" data-edit-habit="${esc(id)}" class="text-[11px] text-[#444] hover:underline ml-2">수정</button><button type="button" data-delete-habit="${esc(id)}" class="text-[11px] text-[#B45650] hover:underline ml-2">삭제</button></span></div>`;
  }

  /* ---------- Today ---------- */
  const TODAY_CHECK='<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  const todayBox=(done,attrs)=>done
    ?`<button type="button" ${attrs} class="w-5 h-5 rounded-md bg-[#1E3A2F] flex items-center justify-center text-white shrink-0">${TODAY_CHECK}</button>`
    :`<button type="button" ${attrs} class="w-5 h-5 rounded-md border border-[#8E928F] bg-white flex items-center justify-center shrink-0"></button>`;
  const rowAction=(label,attrs)=>`<button type="button" ${attrs} class="text-[12px] font-medium text-[#8E928F] hover:text-[#1E3A2F] tap-active shrink-0 px-1">${label}</button>`;

  // Today event row: Stitch schedule row; the dot is replaced by the todo checkbox (user decision: keep event checks).
  function todayEventRow(e){
    return`<div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EFEEEB]"><div class="flex items-center space-x-2.5 min-w-0">${todayBox(e.done,`data-event-toggle="${esc(e.id)}" data-done="${!!e.done}" aria-label="${esc(e.name)} ${e.done?'완료 취소':'완료'}"`)}<span class="text-[13.5px] truncate ${e.done?'text-[#8E928F] line-through':'font-medium text-[#1A1C1A]'}">${e.important?'<span class="text-[#D97706]">★</span> ':''}${esc(e.name)}</span></div></div>`;
  }
  const todayEmpty=text=>`<div class="py-3 text-center text-[12.5px] text-[#8E928F]">${esc(text)}</div>`;

  function todayTodoRow(t){
    return`<div class="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF9F6] transition-colors"><div class="flex items-center space-x-3 min-w-0">${todayBox(t.completed,`data-todo-toggle="${esc(t.id)}" data-done="${!!t.completed}" aria-label="${t.completed?'할 일 완료 취소':'할 일 완료'}"`)}<span class="text-[13.5px] truncate ${t.completed?'text-[#8E928F] line-through':'text-[#1A1C1A] font-medium'}">${esc(t.title)}</span></div><div class="flex items-center space-x-1 shrink-0">${t.completed?'':rowAction('내일로',`data-todo-move="${esc(t.id)}"`)}${rowAction('삭제',`data-todo-delete="${esc(t.id)}" aria-label="${esc(t.title)} 삭제"`)}</div></div>`;
  }

  // Habit badge styles from the Stitch Today screen.
  function habitBadge(schedule){
    const type=schedule?.type||'daily';
    if(type==='weekly_n')return`<span class="px-2 py-0.5 rounded-full bg-[#E8F1EC] text-[#1E3A2F] text-[11px] font-semibold tracking-tight">주 ${Math.max(1,Math.min(7,Number(schedule?.count)||1))}회</span>`;
    if(type==='daily')return'<span class="px-2 py-0.5 rounded-full bg-[#C3ECD6] text-[#133E2B] text-[11px] font-semibold tracking-tight">매일</span>';
    const text=type==='weekdays'?'평일':[...new Set((schedule?.days||[]).map(Number))].sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>['일','월','화','수','목','금','토'][d]).join(' · ');
    return`<span class="px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E9E8E5] text-[#424844] text-[11px] font-semibold tracking-tight">${esc(text)}</span>`;
  }
  function habitStat({rest,type,progress,streak}){
    if(rest)return'<span class="text-[11px] font-normal text-[#8E928F]">오늘은 쉬는 날</span>';
    if(type==='weekly_n')return`<span class="text-[11px] font-medium text-[#8E928F]">${progress.completed}/${progress.target}일 달성</span>`;
    if(streak>=7)return`<span class="text-[11px] font-semibold text-[#1E3A2F]">${streak}일 연속 🔥</span>`;
    if(streak>0)return`<span class="text-[11px] font-semibold text-[#1E3A2F]">${streak}일 연속</span>`;
    return'';
  }
  const DOT={done:'bg-[#1E3A2F]/80',today:'bg-[#C3ECD6]','':'bg-[#E9E8E5]'};
  function todayHabitRow({id,name,schedule,checked,rest,progress,streak,dots,day}){
    const type=schedule?.type||'daily';
    const box=rest
      ?`<button type="button" disabled aria-disabled="true" aria-label="${esc(name)} 오늘은 쉬는 날" class="w-4 h-4 rounded border border-[#8E928F] bg-white shrink-0 cursor-not-allowed opacity-50"></button>`
      :checked
        ?`<button type="button" data-habit-toggle="${esc(id)}" data-day="${esc(day)}" aria-label="${esc(name)} 체크 취소" class="w-4 h-4 rounded border border-[#1E3A2F] bg-[#1E3A2F] flex items-center justify-center text-white shrink-0"><svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></button>`
        :`<button type="button" data-habit-toggle="${esc(id)}" data-day="${esc(day)}" aria-label="${esc(name)} 체크" class="w-4 h-4 rounded border border-[#8E928F] bg-white shrink-0"></button>`;
    return`<div class="p-3 rounded-xl bg-[#FAF9F6] border border-[#EFEEEB]"><div class="flex items-center justify-between mb-2.5"><div class="flex items-center space-x-2.5 min-w-0">${box}<span class="text-[13.5px] font-medium text-[#1A1C1A] truncate">${esc(name)}</span></div><div class="flex items-center space-x-1.5 shrink-0">${habitBadge(schedule)}${habitStat({rest,type,progress,streak})}</div></div><div class="flex items-center space-x-2 pl-6" aria-hidden="true">${(dots||[]).map(state=>`<span class="w-1.5 h-1.5 rounded-full ${DOT[state]||DOT['']}"></span>`).join('')}</div></div>`;
  }

  /* ---------- 가계부 (Stitch "가계부 (Account 메인 최종 수정본)", 2026-11-20) ---------- */
  const won=n=>`${Math.round(Math.abs(Number(n)||0)).toLocaleString('ko-KR')}원`;
  const WEEKDAY=['일','월','화','수','목','금','토'];
  function financeDayHeader(day,first){
    const d=new Date(`${day}T12:00:00`);
    return`<div class="${first?'space-y-2':'space-y-2 pt-1'}"><div class="text-[11px] font-bold text-[#8E928F] px-0.5 tracking-tight">${d.getMonth()+1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}요일</div>`;
  }
  function financeTxRow(x){
    const balance=x.tx_type==='balance',income=x.tx_type==='income';
    const sub=balance?'이전 시작 잔액':`${x.recurring_rule_id?'정기 · ':''}${x.category||'기타'}`;
    const amount=balance?`<span class="text-xs font-medium text-[#8E928F]">${won(x.amount)}</span>`:`<span class="text-xs font-bold ${income?'text-[#1E3A2F]':'text-[#1A1C1A]'}">${income?'+':'-'}${won(x.amount)}</span>`;
    return`<div class="flex items-center justify-between p-2.5 rounded-xl border border-[#F0EFEA] bg-[#FAF9F7] hover:border-[#E5E3DE] transition-colors"><div class="flex items-center gap-2.5 min-w-0"><div class="min-w-0"><div class="text-xs font-semibold text-[#1A1C1A] truncate">${esc(x.title)}</div><div class="text-[10.5px] text-[#8E928F] mt-0.5">${esc(sub)}</div></div></div><div class="flex items-center gap-2 flex-shrink-0 pl-2">${amount}<button type="button" data-edit-finance="${esc(x.id)}" class="px-2 py-1 text-[11px] font-medium rounded-lg bg-white border border-[#E9E8E5] text-[#424844] hover:bg-[#F4F3F0] min-h-[32px]">수정</button><button type="button" data-delete-finance="${esc(x.id)}" aria-label="${esc(x.title)} 가계부 기록 삭제" class="px-2 py-1 text-[11px] font-medium rounded-lg bg-white border border-[#FAD4D1] text-[#B45650] hover:bg-[#FDF0EE] min-h-[32px]">삭제</button></div></div>`;
  }
  // Inline editor that replaces the row in place (no prompt pop-ups).
  function financeTxEditRow(x,categories){
    const options=[...new Set([...categories,x.category||'기타'])].map(c=>`<option${c===(x.category||'기타')?' selected':''}>${esc(c)}</option>`).join('');
    const input='w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E9E8E5] bg-white text-[#1A1C1A] min-h-[38px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]';
    return`<div data-finance-edit-row="${esc(x.id)}" class="p-3 rounded-xl border-2 border-[#1E3A2F] bg-white shadow-sm space-y-2.5"><div class="text-[11px] font-bold text-[#1E3A2F]">거래 수정</div><div><label class="block text-[10.5px] font-semibold text-[#424844] mb-0.5">내용</label><input data-finance-edit-field="title" maxlength="120" class="${input}" type="text" value="${esc(x.title)}"></div><div class="grid grid-cols-2 gap-2"><div><label class="block text-[10.5px] font-semibold text-[#424844] mb-0.5">금액 (원)</label><input data-finance-edit-field="amount" inputmode="numeric" class="${input}" type="text" value="${Number(x.amount||0).toLocaleString('ko-KR')}"></div><div><label class="block text-[10.5px] font-semibold text-[#424844] mb-0.5">날짜</label><input data-finance-edit-field="tx_date" class="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E9E8E5] bg-white text-[#1A1C1A] min-h-[38px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]" type="date" value="${esc(x.tx_date)}"></div></div><div><label class="block text-[10.5px] font-semibold text-[#424844] mb-0.5">분류</label><select data-finance-edit-field="category" class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E9E8E5] bg-white text-[#1A1C1A] min-h-[38px]">${options}</select></div><div class="flex gap-2 pt-1"><button type="button" data-finance-edit-save="${esc(x.id)}" class="flex-1 py-2 text-xs font-bold rounded-lg bg-[#1E3A2F] text-white hover:bg-[#162C23] min-h-[40px] flex items-center justify-center">저장</button><button type="button" data-finance-edit-cancel class="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E9E8E5] text-[#424844] hover:bg-[#F4F3F0] min-h-[40px] flex items-center justify-center">취소</button></div></div>`;
  }
  // Transactions grouped by date (rows arrive newest first).
  function financeTxList(rows,editId,categoriesFor){
    let html='',day='';
    rows.forEach(x=>{if(x.tx_date!==day){html+=(day?'</div>':'')+financeDayHeader(x.tx_date,!day);day=x.tx_date}html+=x.id===editId?financeTxEditRow(x,categoriesFor(x.tx_type)):financeTxRow(x)});
    return html+(day?'</div>':'');
  }
  const financeEmpty=text=>`<div class="py-6 text-center text-xs text-[#8E928F]">${esc(text)}</div>`;
  const CHIP_ON='px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1E3A2F] text-white min-h-[36px] flex items-center';
  const CHIP_OFF='px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FAF9F6] border border-[#E9E8E5] text-[#424844] hover:bg-[#F4F3F0] min-h-[36px] flex items-center';
  const financeChip=(name,on)=>`<button type="button" data-finance-category="${esc(name)}" aria-pressed="${!!on}" class="${on?CHIP_ON:CHIP_OFF}">${esc(name)}</button>`;
  // Donut (SVG stroke-dasharray, no style attributes) + category rows; colors follow the Stitch analysis palette.
  const ANALYSIS_COLORS=['#1E3A2F','#B45650','#4E70A0','#C97A1E','#416655','#8E928F','#86A496','#78756F'];
  const DONUT_C=2*Math.PI*38;
  function financeAnalysis(rows,total,type){
    let offset=0;
    const circles=rows.map(([,value],i)=>{const len=value/total*DONUT_C,c=`<circle cx="50" cy="50" fill="none" r="38" stroke="${ANALYSIS_COLORS[i%ANALYSIS_COLORS.length]}" stroke-dasharray="${len.toFixed(2)} ${DONUT_C.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" stroke-width="12"></circle>`;offset+=len;return c}).join('');
    const list=rows.map(([name,value],i)=>`<div class="space-y-1"><div class="flex items-center justify-between text-xs"><div class="flex items-center gap-1.5"><span data-analysis-color="${i%ANALYSIS_COLORS.length}" class="w-2.5 h-2.5 rounded-full"></span><span class="font-bold text-[#1A1C1A]">${esc(name)}</span></div><div class="flex items-center gap-2"><span class="font-bold text-[#1A1C1A]">${won(value)}</span><span class="text-[11px] text-[#8E928F] font-semibold w-7 text-right">${Math.round(value/total*100)}%</span></div></div><div class="w-full bg-[#F4F3F0] h-1.5 rounded-full overflow-hidden"><div data-analysis-bar="${(value/total*100).toFixed(1)}" data-analysis-color="${i%ANALYSIS_COLORS.length}" class="h-1.5 rounded-full"></div></div></div>`).join('');
    return`<div class="flex flex-col items-center justify-center py-2"><div class="relative w-40 h-40 flex items-center justify-center"><svg class="w-full h-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label="${type==='expense'?'지출':'수입'} 분류별 비율"><circle cx="50" cy="50" fill="none" r="38" stroke="#F4F3F0" stroke-width="12"></circle>${circles}</svg><div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"><span class="text-[10.5px] font-medium text-[#8E928F]">${type==='expense'?'총지출':'총수입'}</span><span class="text-sm font-bold text-[#1A1C1A] mt-0.5">${won(total)}</span></div></div></div><div class="space-y-3 pt-1">${list}</div>`;
  }

  global.HaruStitchViews={esc,EVENT_COLORS,COLOR_STYLE,eventStyle,shortDate,dateRange,calendarCell,calendarEventRow,calendarEventsEmpty,calendarHabitRow,calendarHabitsEmpty,calendarHabitSettingRow,todayEventRow,todayEmpty,todayTodoRow,habitBadge,habitStat,todayHabitRow,won,financeDayHeader,financeTxRow,financeTxEditRow,financeTxList,financeEmpty,financeChip,CHIP_ON,CHIP_OFF,ANALYSIS_COLORS,financeAnalysis};
})(typeof window!=='undefined'?window:globalThis);
