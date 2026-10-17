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

  const budgetLimit=999999999999;
  const expenseCategories=['식비','교통','쇼핑','생활','교육','세금','기타'];
  function budgetCategories(rows,month){
    return [...new Set([...expenseCategories,...(rows||[]).filter(row=>row.tx_type==='expense'&&String(row.tx_date||'').startsWith(month)).map(row=>row.category||'기타')])];
  }
  function parseBudget(value){
    const text=String(value??'').trim();
    if(!text)return null;
    if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text))throw new Error('예산은 0 이상의 원 단위 정수로 입력해 주세요.');
    const amount=Number(text.replaceAll(',',''));
    if(!Number.isSafeInteger(amount)||amount>budgetLimit)throw new Error('예산은 999,999,999,999원 이하로 입력해 주세요.');
    return amount;
  }
  function budgetSummary(rows,month,items={}){
    const spending=new Map();let income=0,expense=0;
    for(const row of rows||[]){
      if(!String(row.tx_date||'').startsWith(month))continue;
      const amount=Number(row.amount)||0;
      if(row.tx_type==='income')income+=amount;
      if(row.tx_type==='expense'){expense+=amount;const category=row.category||'기타';spending.set(category,(spending.get(category)||0)+amount)}
    }
    const categories=Object.entries(items).map(([category,budget])=>{
      const used=spending.get(category)||0,amount=Number(budget);
      return{category,budget:amount,used,remaining:amount-used,percent:amount>0?Math.min(100,used/amount*100):used>0?100:0};
    });
    const budget=categories.reduce((sum,x)=>sum+x.budget,0),used=categories.reduce((sum,x)=>sum+x.used,0);
    return{categories,budget,used,remaining:budget-used,unbudgeted:expense-used,income,expense,net:income-expense,configured:categories.length>0};
  }
  global.HaruFinance={currentBalance,filterRows,normalize,budgetCategories,parseBudget,budgetSummary};
})(typeof window!=='undefined'?window:globalThis);
