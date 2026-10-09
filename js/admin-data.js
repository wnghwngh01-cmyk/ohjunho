/* Shared paging logic; no credentials or private data access. */
(function(root){
  async function bugReports(rpc,{search='',status='',offset=0}={}){
    const end=offset+51;
    const sources=await Promise.all(['bugs','legacy_bugs'].map(async kind=>{
      const rows=[];
      for(let start=0;start<end;start+=50){
        const page=await rpc('operator_list',{p_kind:kind,p_search:search,p_status:status,p_offset:start});
        rows.push(...page.slice(0,50).map(row=>({...row,case_kind:kind})));
        if(page.length<=50)break;
      }
      return rows;
    }));
    return sources.flat().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||String(b.id).localeCompare(String(a.id))||a.case_kind.localeCompare(b.case_kind)).slice(offset,end);
  }
  root.OperatorData={bugReports};
})(globalThis);
