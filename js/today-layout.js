(function(global){
  'use strict';
  const defaults=[
    {id:'events',enabled:true},{id:'todos',enabled:true},{id:'habits',enabled:true},{id:'quick_record',enabled:true},
    {id:'protein',enabled:false},{id:'finance_entry',enabled:false},{id:'finance_budget',enabled:false}
  ];
  const ids=new Set(defaults.map(x=>x.id));
  function normalize(value){
    if(!Array.isArray(value))return defaults.map(x=>({...x}));
    const seen=new Set(),result=[];
    for(const item of value){if(item&&ids.has(item.id)&&!seen.has(item.id)&&typeof item.enabled==='boolean'){seen.add(item.id);result.push({id:item.id,enabled:item.enabled})}}
    for(const item of defaults)if(!seen.has(item.id))result.push({...item});
    return result;
  }
  function move(layout,index,delta){const result=normalize(layout),target=index+delta;if(index<0||index>=result.length||target<0||target>=result.length)return result;[result[index],result[target]]=[result[target],result[index]];return result}
  global.HaruTodayLayout={defaults:()=>defaults.map(x=>({...x})),normalize,move};
})(typeof window!=='undefined'?window:globalThis);
