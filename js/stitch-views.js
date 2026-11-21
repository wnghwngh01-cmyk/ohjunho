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

  /* ---------- 광장 (Stitch "광장 (발견)", "광장 (앱 개선)", "광장 - 상태 모음", 2026-11-20) ---------- */
  // Kind badges: 기록 steel, 일기 mint, 독서록 amber, 자유글 gray, 대장간 coral.
  const KIND={record:['기록','bg-[#EDF3F8] text-[#4E70A0]'],diary:['일기','bg-[#EBF7F0] text-[#1E3A2F]'],book:['독서록','bg-[#FEF6EC] text-[#C97A1E]'],community:['자유글','bg-[#F4F3F0] text-[#424844]'],forge:['대장간','bg-[#FDF0EE] text-[#B45650]']};
  const SQ_CARD='bg-white rounded-2xl border border-[#F0EFEA] shadow-subtle p-4 space-y-3';
  const SQ_TAB_ON='py-2 text-xs font-bold rounded-lg bg-white text-[#1E3A2F] shadow-sm flex items-center justify-center min-h-[44px] whitespace-nowrap';
  const SQ_TAB_OFF='py-2 text-xs font-semibold rounded-lg text-[#8E928F] hover:text-[#1A1C1A] flex items-center justify-center min-h-[44px] whitespace-nowrap';
  const ICON_HEART='<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>';
  const SVG_LINE='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  const squareEmpty=(text,strong=false)=>`<div class="${SQ_CARD} py-10 text-center"><p class="${strong?'text-sm font-semibold text-[#424844]':'text-xs text-[#8E928F]'}">${esc(text)}</p></div>`;
  // Photos: 1 = full width 4:3, 2 = 2 columns, 3 = 3 columns, 4+ = 2x2 with "+N" over the 4th. Extra photos stay in the
  // gallery (hidden) so the lightbox can page through all of them.
  function squareGallery(media){
    if(!media.length)return'';
    const cell=(item,i,cls,extra='')=>`<button type="button" data-lightbox="${esc(item.url)}" aria-label="공유 사진 ${i+1} 크게 보기" class="${cls}"><img src="${esc(item.url)}" alt="${esc(item.name||`공유 사진 ${i+1}`)}" loading="lazy" class="w-full h-full object-cover">${extra}</button>`;
    if(media.length===1)return`<div class="rounded-xl overflow-hidden" data-lightbox-gallery>${cell(media[0],0,'w-full aspect-[4/3] bg-[#EAE8E3] block')}</div>`;
    const cols=media.length===3?'grid-cols-3':'grid-cols-2',more=media.length-4;
    return`<div class="grid ${cols} gap-1.5 rounded-xl overflow-hidden" data-lightbox-gallery>${media.map((item,i)=>i>3?cell(item,i,'hidden'):cell(item,i,i===3&&more>0?'relative aspect-square bg-[#EAE8E3] block':'aspect-square bg-[#EAE8E3] block',i===3&&more>0?`<span class="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm font-bold">+${more}</span>`:'')).join('')}</div>`;
  }
  // p = feed row; c = context computed by app.js (own, avatar html, title badge html, media, book author, profile url, time,
  // forge certificate html and its reaction label).
  function squareCard(p,c){
    const kind=KIND[p.source_type]||['공유글','bg-[#F4F3F0] text-[#424844]'],forge=p.source_type==='forge',liked=!!p.liked_by_me;
    const follow=c.own?'':`<button type="button" data-follow="${esc(p.user_id)}" data-on="${!!p.following_author}" class="${p.following_author?'min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#1E3A2F] text-white flex items-center justify-center whitespace-nowrap':'min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#1E3A2F] text-[#1E3A2F] active:bg-[#E8F1EC] flex items-center justify-center whitespace-nowrap'}">${p.following_author?'팔로잉':'팔로우'}</button>`;
    const head=`<div class="flex items-center justify-between"><div class="flex items-center gap-2.5 min-w-0">${c.avatar}<div class="min-w-0"><div class="flex items-center gap-1.5 leading-tight min-w-0"><a href="${esc(c.profileUrl)}" class="text-xs font-bold text-[#1A1C1A] truncate">${esc(p.display_name)}</a>${c.title||''}${c.own?'<span class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F4F3F0] text-[#8E928F] whitespace-nowrap">내 글</span>':''}</div><div class="text-[10.5px] text-[#8E928F] mt-0.5 truncate">${esc(p.lab_name)}</div></div></div>${follow}</div>`;
    const badge=`<div class="flex items-center gap-2"><span class="px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${kind[1]} whitespace-nowrap">${kind[0]}</span>${c.bookAuthor?`<span class="text-xs text-[#424844] font-medium">${esc(c.bookAuthor)} 지음</span>`:''}</div>`;
    const body=forge?`<div data-forge-slot>${c.forgeHtml||'<div class="h-[160px] rounded-xl border-2 border-dashed border-[#F0EFEA] bg-[#FAF9F6] flex items-center justify-center"><span class="text-xs text-[#8E928F]">대장간 증명서 자리</span></div>'}</div><div class="text-[10px] text-[#8E928F]">${esc(c.time)}</div>`
      :`<div>${p.source_type==='community'?'':`<h2 class="text-xs font-bold text-[#1A1C1A] mb-1">${esc(p.title)}</h2>`}<p data-square-text class="text-xs text-[#424844] leading-relaxed line-clamp-4 whitespace-pre-line break-words">${esc(p.body)}</p><button type="button" data-square-more aria-expanded="false" class="hidden text-xs font-semibold text-[#1E3A2F] mt-1">더보기</button><div class="text-[10px] text-[#8E928F] mt-1.5">${esc(c.time)}</div></div>`;
    const likeCls=forge?'min-h-[44px] flex items-center gap-1.5 text-[#1E3A2F] hover:text-[#162C23] whitespace-nowrap font-medium':liked?'min-h-[44px] flex items-center gap-1 text-[#B45650] whitespace-nowrap':'min-h-[44px] flex items-center gap-1 text-[#424844] hover:text-[#1E3A2F] whitespace-nowrap';
    const like=`<button type="button" data-like="${esc(p.id)}" data-on="${liked}" aria-pressed="${liked}" aria-label="${esc(c.likeLabel)}" class="${likeCls}">${forge?'':`<svg class="w-4 h-4${liked?' fill-current':''}" ${liked?'viewBox="0 0 24 24"':SVG_LINE}>${ICON_HEART}</svg>`}${forge?`<span>${esc(c.forgeLabel)}</span><span class="ml-1${liked?' font-semibold':''}" data-like-count>${Number(p.like_count)||0}</span>`:`<span${liked?' class="font-semibold"':''} data-like-count>${Number(p.like_count)||0}</span>`}</button>`;
    const comments=`<button type="button" data-comments="${esc(p.id)}" aria-expanded="false" aria-label="댓글 ${Number(p.comment_count)||0}개 보기" class="min-h-[44px] flex items-center gap-1 text-[#424844] hover:text-[#1E3A2F] whitespace-nowrap"><svg class="w-4 h-4" ${SVG_LINE}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span class="count">${Number(p.comment_count)||0}</span><svg data-comment-arrow class="w-3 h-3 text-[#8E928F]" ${SVG_LINE}><polyline points="6 9 12 15 18 9"></polyline></svg></button>`;
    const share=`<button type="button" data-copy-link="${esc(c.profileUrl)}" class="min-h-[44px] flex items-center gap-1 text-[#424844] hover:text-[#1E3A2F] whitespace-nowrap"><svg class="w-4 h-4" ${SVG_LINE}><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg><span>공유</span></button>`;
    const menuBtn='w-full min-h-[36px] px-3 py-1.5 text-left text-xs text-[#B45650] hover:bg-[#FDF0EE] flex items-center whitespace-nowrap';
    const menu=`<details class="relative" data-square-menu><summary aria-label="게시물 더보기" aria-expanded="false" class="min-h-[44px] px-2 flex items-center cursor-pointer list-none text-[#8E928F] hover:text-[#1A1C1A]"><svg class="w-4 h-4" ${SVG_LINE}><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></summary><div class="absolute right-0 bottom-full mb-1 w-24 bg-white rounded-xl border border-[#F0EFEA] shadow-md py-1 z-20">${c.own?`<button type="button" data-unpublish="${esc(p.source_type)}:${esc(p.source_id)}" class="${menuBtn}">내리기</button>`:`<button type="button" data-report-type="publication" data-report-id="${esc(p.id)}" data-report-user="${esc(p.user_id)}" data-report-label="${esc(p.lab_name)}의 게시물" class="${menuBtn}">신고</button><button type="button" data-block-user="${esc(p.user_id)}" data-block-name="${esc(p.display_name)}" class="${menuBtn}">차단</button>`}</div></details>`;
    const panel=`<div data-comment-panel="${esc(p.id)}" class="hidden pt-3 border-t border-[#F0EFEA] space-y-3 bg-[#FAF9F6] p-3 rounded-xl"><div data-comment-list class="space-y-3"></div><div><div data-reply-line class="hidden flex items-center justify-between pb-2"><span data-reply-label class="text-[11px] text-[#424844]"></span><button type="button" data-reply-cancel="${esc(p.id)}" class="text-[11px] font-semibold text-[#8E928F] hover:text-[#424844]">취소</button></div><form data-comment-form="${esc(p.id)}" novalidate class="flex items-center gap-1.5"><input data-comment-input="${esc(p.id)}" maxlength="2000" placeholder="댓글을 입력하세요" enterkeyhint="send" autocomplete="off" class="flex-1 min-h-[44px] px-3 text-xs bg-white border border-[#E9E8E5] rounded-xl text-[#1A1C1A] placeholder-[#8E928F] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]"><button type="button" data-submit-comment="${esc(p.id)}" aria-label="댓글 등록" class="min-h-[44px] px-3.5 text-xs font-semibold rounded-xl bg-[#1E3A2F] active:bg-[#162C23] text-white flex items-center justify-center whitespace-nowrap">등록</button></form></div></div>`;
    return`<article data-publication-card="${esc(p.id)}" class="${SQ_CARD}">${head}${squareGallery(c.media||[])}${badge}${body}<div class="pt-2 border-t border-[#F0EFEA] flex items-center justify-between text-xs text-[#424844]"><div class="flex items-center gap-3">${like}${comments}${share}</div>${menu}</div>${panel}</article>`;
  }
  // One comment (root or reply). c = {avatar, title, mine, time}.
  function squareComment(m,c,pubId,isReply,first){
    const actions=`<button type="button" data-reply-comment="${esc(m.id)}" data-reply-publication="${esc(pubId)}" data-reply-name="${esc(m.display_name)}" class="min-h-[32px] text-[#424844] hover:text-[#1E3A2F] flex items-center whitespace-nowrap">답글</button>${c.mine?`<button type="button" data-delete-comment="${esc(m.id)}" data-comment-publication="${esc(pubId)}" class="min-h-[32px] text-[#B45650] hover:bg-[#FDF0EE] flex items-center whitespace-nowrap">삭제</button>`:`<button type="button" data-report-type="comment" data-report-id="${esc(m.id)}" data-report-user="${esc(m.user_id)}" data-report-label="${esc(m.display_name)}님의 댓글" class="min-h-[32px] text-[#8E928F] hover:text-[#B45650] flex items-center whitespace-nowrap">신고</button>`}`;
    const wrap=isReply?'pl-6 space-y-1 border-l-2 border-[#E9E8E5]':first?'space-y-1':'space-y-1 pt-1';
    return`<div data-comment-id="${esc(m.id)}" class="${wrap}"><div class="flex items-center justify-between"><div class="flex items-center gap-1.5 min-w-0">${c.avatar}<span class="text-xs font-bold text-[#1A1C1A] truncate">${esc(m.display_name)}</span>${c.title||''}<span class="text-[10px] text-[#8E928F] whitespace-nowrap">${esc(c.time)}</span></div></div><p class="text-xs text-[#424844] pl-6 whitespace-pre-line break-words">${m.parent_display_name?`<strong class="font-bold text-[#1E3A2F]">@${esc(m.parent_display_name)}</strong> `:''}${esc(m.body)}</p><div class="flex items-center gap-3 pl-6 pt-0.5 text-[10.5px]">${actions}</div></div>`;
  }
  const squareCommentsEmpty=()=>'<div class="text-center py-5"><p class="text-xs text-[#8E928F]">첫 댓글을 남겨보세요.</p></div>';
  // 앱 개선 제안 카드. Status badges: 제안됨 gray, 검토 후 계획 steel, 개발 중 amber, 반영 완료 mint, 보류 gray.
  const FEATURE_STATUS={proposed:['제안됨','bg-[#F0EFEA] text-[#424844]'],planned:['검토 후 계획','bg-[#EDF3F8] text-[#4E70A0]'],working:['개발 중','bg-[#FEF6EC] text-[#C97A1E]'],done:['반영 완료','bg-[#C3ECD6] text-[#133E2B]'],declined:['보류','bg-[#F4F3F0] text-[#8E928F]']};
  function squareFeature(f,date){
    const s=FEATURE_STATUS[f.status]||FEATURE_STATUS.proposed,on=!!f.voted_by_me;
    const vote=on?`<button type="button" data-vote="${esc(f.id)}" data-on="true" aria-pressed="true" aria-label="추천 취소" class="min-w-[48px] min-h-[64px] px-2 py-2 rounded-xl bg-[#1E3A2F] text-white flex flex-col items-center justify-center gap-1 flex-shrink-0 active:bg-[#162C23] select-none"><svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 4L3 17h18L12 4z"></path></svg><span class="text-xs font-bold leading-none">${Number(f.vote_count)||0}</span></button>`
      :`<button type="button" data-vote="${esc(f.id)}" data-on="false" aria-pressed="false" aria-label="추천" class="min-w-[48px] min-h-[64px] px-2 py-2 rounded-xl bg-[#FAF9F6] border border-[#F0EFEA] text-[#424844] flex flex-col items-center justify-center gap-1 flex-shrink-0 hover:border-[#1E3A2F] active:bg-[#E8F1EC] select-none"><svg class="w-4 h-4" ${SVG_LINE}><path d="M12 4L3 17h18L12 4z"></path></svg><span class="text-xs font-semibold leading-none">${Number(f.vote_count)||0}</span></button>`;
    return`<article class="bg-white rounded-2xl border border-[#F0EFEA] shadow-subtle p-4 flex gap-3.5">${vote}<div class="flex-1 min-w-0 space-y-1.5"><h2 class="text-xs font-bold text-[#1A1C1A] leading-snug break-words">${esc(f.title)}</h2>${f.body?`<p class="text-xs text-[#424844] leading-relaxed whitespace-pre-line break-words">${esc(f.body)}</p>`:''}<div class="flex items-center gap-2 pt-1 flex-wrap"><span class="px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${s[1]} whitespace-nowrap">${s[0]}</span><span class="text-[10px] text-[#8E928F]">${esc(f.display_name)} · ${esc(date)}</span></div></div></article>`;
  }

  global.HaruStitchViews={esc,EVENT_COLORS,COLOR_STYLE,eventStyle,shortDate,dateRange,calendarCell,calendarEventRow,calendarEventsEmpty,calendarHabitRow,calendarHabitsEmpty,calendarHabitSettingRow,todayEventRow,todayEmpty,todayTodoRow,habitBadge,habitStat,todayHabitRow,won,financeDayHeader,financeTxRow,financeTxEditRow,financeTxList,financeEmpty,financeChip,CHIP_ON,CHIP_OFF,ANALYSIS_COLORS,financeAnalysis,KIND,SQ_CARD,SQ_TAB_ON,SQ_TAB_OFF,squareEmpty,squareGallery,squareCard,squareComment,squareCommentsEmpty,FEATURE_STATUS,squareFeature};
})(typeof window!=='undefined'?window:globalThis);
