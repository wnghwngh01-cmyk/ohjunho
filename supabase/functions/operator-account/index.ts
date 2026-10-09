import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const origins = new Set(['https://ohjunho.com','https://test1.ohjunho.com','https://test2.ohjunho.com']);
async function removeFiles(client: ReturnType<typeof createClient>, bucket: string, userId: string) {
  const folders = [userId];
  while (folders.length) {
    const folder = folders.shift()!;
    // List all before deleting, so pagination cannot skip files as the list shrinks.
    const paths: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const {data,error} = await client.storage.from(bucket).list(folder,{limit:100,offset});
      if(error) throw error;
      for(const file of data ?? []) {
        const path = `${folder}/${file.name}`;
        if(file.id) paths.push(path); else folders.push(path);
      }
      if(!data || data.length < 100) break;
    }
    for(let i=0;i<paths.length;i+=100) {
      const {error}=await client.storage.from(bucket).remove(paths.slice(i,i+100));
      if(error) throw error;
    }
  }
}

Deno.serve(async request => {
  const origin=request.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://ohjunho.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.has(origin))return reply({error:'허용되지 않은 출처입니다.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'POST 요청만 허용됩니다.'},405);
  let operation: number|undefined;
  let service: ReturnType<typeof createClient>|undefined;
  try {
    const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if(!url||!key||!secret)throw new Error('서버 설정이 완료되지 않았습니다.');
    const authorization=request.headers.get('Authorization')||'';
    const caller=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:{user},error:authError}=await caller.auth.getUser();
    if(authError||!user)return reply({error:'로그인이 필요합니다.'},401);
    const body=await request.json();
    if(!['ban','permanent_ban','unban','delete'].includes(body.action)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)||body.confirmation!==body.id)return reply({error:'대상과 확인 입력을 확인하세요.'},400);
    const {data,error}=await caller.rpc('operator_account_prepare',{p_target:body.id,p_action:body.action,p_reason:body.reason});
    if(error)return reply({error:error.message},403);
    operation=data;
    service=createClient(url,secret,{auth:{persistSession:false}});
    if(body.action==='delete') {
      const banned=await service.auth.admin.updateUserById(body.id,{ban_duration:'876000h'});if(banned.error)throw banned.error;
      for(const bucket of ['lab-private','lab-public'])await removeFiles(service,bucket,body.id);
      const {error}=await service.auth.admin.deleteUser(body.id);if(error)throw error;
    } else {
      const {error}=await service.auth.admin.updateUserById(body.id,{ban_duration:body.action==='ban'?'168h':body.action==='permanent_ban'?'876000h':'none'});if(error)throw error;
    }
    const finished=await service.rpc('operator_account_finish',{p_operation:operation,p_ok:true});if(finished.error)throw finished.error;
    return reply({ok:true});
  }catch{
    if(service&&operation)await service.rpc('operator_account_finish',{p_operation:operation,p_ok:false});
    return reply({error:'계정 조치가 끝나지 않았습니다. 운영 기록을 확인하고 다시 시도하세요. 일부 파일이 삭제되었을 수 있으므로 삭제 실패를 성공으로 처리하지 않습니다.'},500);
  }
});
