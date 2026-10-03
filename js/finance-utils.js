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

  global.HaruFinance={currentBalance};
})(typeof window!=='undefined'?window:globalThis);
