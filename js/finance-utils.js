(function(global){
  'use strict';

  function currentBalance(rows,throughDay){
    const applicable=(rows||[]).filter(row=>!throughDay||String(row.tx_date||'')<=throughDay);
    const balances={};
    [...applicable].sort((a,b)=>String(a.tx_date||'').localeCompare(String(b.tx_date||''))||String(a.created_at||'').localeCompare(String(b.created_at||''))).forEach(row=>{
      if(row.tx_type==='balance')balances[row.title]=Number(row.amount)||0;
    });
    const starting=Object.values(balances).reduce((sum,value)=>sum+value,0);
    const income=applicable.filter(row=>row.tx_type==='income').reduce((sum,row)=>sum+(Number(row.amount)||0),0);
    const expense=applicable.filter(row=>row.tx_type==='expense').reduce((sum,row)=>sum+(Number(row.amount)||0),0);
    return{starting,income,expense,total:starting+income-expense};
  }

  const normalize=value=>String(value??'').trim().toLocaleLowerCase('ko-KR');

  function filterRows(rows,filters={}){
    const query=normalize(filters.query),date=String(filters.date||''),type=String(filters.type||''),category=String(filters.category||'');
    return (rows||[]).filter(row=>{
      if(date&&String(row.tx_date||'').slice(0,10)!==date)return false;
      if(type&&String(row.tx_type||'')!==type)return false;
      if(category&&String(row.category||'')!==category)return false;
      return !query||normalize(row.title).includes(query);
    }).sort((a,b)=>String(b.tx_date||'').localeCompare(String(a.tx_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
  }

  global.HaruFinance={currentBalance,filterRows,normalize};
})(typeof window!=='undefined'?window:globalThis);
