(function(global){
  'use strict';

  const normalize=value=>String(value??'').trim().toLocaleLowerCase('ko-KR');

  function filterRows(rows,filters={}){
    const query=normalize(filters.query),date=String(filters.date||''),mood=String(filters.mood||'');
    return (rows||[]).filter(row=>{
      if(row.category!=='일상')return false;
      if(date&&String(row.entry_date||'').slice(0,10)!==date)return false;
      if(mood&&String(row.mood||'')!==mood)return false;
      return !query||normalize(`${row.title||''} ${row.body||''}`).includes(query);
    }).sort((a,b)=>String(b.entry_date||'').localeCompare(String(a.entry_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
  }

  global.HaruDiarySearch={filterRows,normalize};
})(typeof window!=='undefined'?window:globalThis);
