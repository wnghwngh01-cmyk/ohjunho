(function(global){
  'use strict';
  const defaults=[
    {id:'quote',enabled:true},{id:'events',enabled:true},{id:'todos',enabled:true},{id:'habits',enabled:true},
    {id:'protein',enabled:false},{id:'budget',enabled:false},{id:'records',enabled:true}
  ];
  const ids=new Set(defaults.map(x=>x.id));
  function normalize(value){
    if(!Array.isArray(value))return defaults.map(x=>({...x}));
    const seen=new Set(),result=[];
    for(const item of value){if(!item||typeof item.enabled!=='boolean')continue;const id=item.id==='quick_record'?'records':['finance_entry','finance_budget'].includes(item.id)?'budget':item.id;if(!ids.has(id))continue;const existing=result.find(x=>x.id===id);if(existing){if(id==='budget'&&item.enabled)existing.enabled=true;continue}seen.add(id);result.push({id,enabled:item.enabled})}
    for(const item of defaults)if(!seen.has(item.id))result.push({...item});
    return result;
  }
  function move(layout,index,delta){const result=normalize(layout),target=index+delta;if(index<0||index>=result.length||target<0||target>=result.length)return result;[result[index],result[target]]=[result[target],result[index]];return result}
  global.HaruTodayLayout={defaults:()=>defaults.map(x=>({...x})),normalize,move};
})(typeof window!=='undefined'?window:globalThis);
