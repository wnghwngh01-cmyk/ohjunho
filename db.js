'use strict';
(function(){
  const cfg=window.LAB_CONFIG;
  if(!window.supabase||!window.supabase.createClient){
    const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const today=()=>dateKey(new Date());
    const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    window.LabDB={initError:'Supabase SDK를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.',today,dateKey,monthKey,user:()=>null};
    return;
  }
  const client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let currentUser=null;
  const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today=()=>dateKey(new Date());
  const monthKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const fail=(error,context='요청')=>{if(error){const e=new Error(`${context}: ${error.message||error}`);e.cause=error;throw e}};
  const user=()=>{if(!currentUser)throw new Error('로그인이 필요합니다.');return currentUser};
  const uid=()=>user().id;
  const parseTags=v=>Array.isArray(v)?v:String(v||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
  const slugify=v=>String(v||'').toLowerCase().trim().replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,40);

  async function getSession(){const {data,error}=await client.auth.getSession();fail(error,'세션 확인');currentUser=data.session?.user||null;return data.session||null}
  function onAuthChange(cb){return client.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;cb&&cb(session)})}
  async function signIn(email,password){const {data,error}=await client.auth.signInWithPassword({email,password});fail(error,'로그인');currentUser=data.user;return data}
  async function signUp(email,password,displayName,acceptedTerms=false){const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:displayName,terms_accepted:acceptedTerms?'true':'false',terms_version:acceptedTerms?'2026-09-09':''}}});fail(error,'회원가입');currentUser=data.user||null;return data}
  async function signOut(){const {error}=await client.auth.signOut();fail(error,'로그아웃');currentUser=null}
  async function ensureProfile(){
    const u=user();
    let {data,error}=await client.from('profiles').select('*').eq('id',u.id).maybeSingle();
    fail(error,'프로필 불러오기');
    if(data)return data;
    const name=String(u.user_metadata?.display_name||u.email?.split('@')[0]||'사용자').slice(0,30);
    const slug=`lab-${u.id.replaceAll('-','').slice(0,12)}`;
    ({data,error}=await client.from('profiles').insert({id:u.id,display_name:name,lab_name:`${name}의 연구실`,slug}).select().single());
    fail(error,'프로필 만들기');return data;
  }
  async function updateProfile(patch){
    const allowed={};
    if(patch.display_name!==undefined)allowed.display_name=String(patch.display_name).trim().slice(0,30);
    if(patch.lab_name!==undefined)allowed.lab_name=String(patch.lab_name).trim().slice(0,50);
    if(patch.slug!==undefined){const s=slugify(patch.slug);if(s.length<3)throw new Error('공개 주소 ID는 영문 소문자·숫자·하이픈으로 3자 이상 입력해 주세요.');allowed.slug=s}
    if(patch.bio!==undefined)allowed.bio=String(patch.bio).slice(0,500);
    if(patch.public_profile!==undefined)allowed.public_profile=!!patch.public_profile;
    const {data,error}=await client.from('profiles').update(allowed).eq('id',uid()).select().single();fail(error,'프로필 저장');return data;
  }

  async function completeOnboarding(displayName,labName){
    const name=String(displayName||'').trim().slice(0,30),lab=String(labName||'').trim().slice(0,50);
    if(!name)throw new Error('이름을 입력해 주세요.');
    if(!lab)throw new Error('연구실 이름을 입력해 주세요.');
    const {data,error}=await client.from('profiles').update({display_name:name,lab_name:lab,onboarding_completed_at:new Date().toISOString()}).eq('id',uid()).select().single();
    fail(error,'연구실 만들기');return data;
  }

  async function acceptTerms(version='2026-09-09'){
    const {data,error}=await client.from('profiles').update({terms_version:String(version),terms_accepted_at:new Date().toISOString()}).eq('id',uid()).select().single();
    fail(error,'약관 동의 저장');return data;
  }

  async function dashboard(day=today()){
    const d=new Date(`${day}T00:00:00`),mk=monthKey(d);
    const [goals,events,habits,checks,projects,memory]=await Promise.all([
      client.from('goals').select('*').eq('user_id',uid()).or(`and(kind.eq.final,period_key.eq.),and(kind.eq.monthly,period_key.eq.${mk})`),
      client.from('events').select('*').eq('user_id',uid()).lte('start_date',day).gte('end_date',day).order('created_at'),
      client.from('habits').select('*').eq('user_id',uid()).eq('active',true).order('created_at'),
      client.from('habit_checks').select('*').eq('user_id',uid()).eq('day',day),
      client.from('projects').select('*').eq('user_id',uid()).eq('status','active').order('updated_at',{ascending:false}).limit(6),
      client.from('records').select('id,title,body,entry_date,category').eq('user_id',uid()).eq('entry_date',(()=>{const x=new Date(d);x.setFullYear(x.getFullYear()-1);return dateKey(x)})()).order('created_at',{ascending:false}).limit(1)
    ]);
    [goals,events,habits,checks,projects,memory].forEach((r,i)=>fail(r.error,['목표','일정','습관','체크','프로젝트','과거 기록'][i]));
    return {goals:goals.data||[],events:events.data||[],habits:habits.data||[],checks:checks.data||[],projects:projects.data||[],memory:memory.data?.[0]||null};
  }

  async function listRecords(){const {data,error}=await client.from('records').select('*,record_media(*)').eq('user_id',uid()).order('entry_date',{ascending:false}).order('created_at',{ascending:false}).limit(300);fail(error,'기록 불러오기');return data||[]}
  async function createRecord(payload){const row={user_id:uid(),category:payload.category||'생각',mood:String(payload.mood||'').slice(0,30),entry_date:payload.entry_date||today(),title:String(payload.title||'').slice(0,120),body:String(payload.body||'').slice(0,12000),tags:parseTags(payload.tags)};const {data,error}=await client.from('records').insert(row).select().single();fail(error,'기록 저장');return data}
  async function updateRecord(id,payload){const row={category:payload.category||'생각',mood:String(payload.mood||'').slice(0,30),entry_date:payload.entry_date||today(),title:String(payload.title||'').slice(0,120),body:String(payload.body||'').slice(0,12000),tags:parseTags(payload.tags)};const {data,error}=await client.from('records').update(row).eq('id',id).eq('user_id',uid()).select().single();fail(error,'기록 수정');return data}
  async function deleteRecord(id){const {error}=await client.from('records').delete().eq('id',id).eq('user_id',uid());fail(error,'기록 삭제')}
  async function addRecordMedia(row){const {data,error}=await client.from('record_media').insert({...row,user_id:uid()}).select().single();fail(error,'사진 정보 저장');return data}
  async function removeRecordMedia(id){const {data,error}=await client.from('record_media').delete().eq('id',id).eq('user_id',uid()).select().maybeSingle();fail(error,'사진 삭제');return data}
  async function reorderRecordMedia(recordId,orderedIds){const rows=(orderedIds||[]).map((id,index)=>({id,sort_order:index}));for(const row of rows){const {error}=await client.from('record_media').update({sort_order:row.sort_order}).eq('id',row.id).eq('record_id',recordId).eq('user_id',uid());fail(error,'사진 순서 저장')}return rows}

  async function listEventsForMonth(start,end){const {data,error}=await client.from('events').select('*').eq('user_id',uid()).lte('start_date',end).gte('end_date',start).order('start_date');fail(error,'일정 불러오기');return data||[]}
  async function addEvent(name,startDate,endDate){const clean=String(name||'').trim().slice(0,300);if(!clean)throw new Error('일정 내용을 입력해 주세요.');const end=endDate||startDate;if(!startDate||!end||end<startDate)throw new Error('일정 날짜 범위를 확인해 주세요.');const {data,error}=await client.from('events').insert({user_id:uid(),name:clean,start_date:startDate,end_date:end}).select().single();fail(error,'일정 추가');return data}
  async function updateEvent(id,name,startDate,endDate){const clean=String(name||'').trim().slice(0,300);const end=endDate||startDate;if(!clean)throw new Error('일정 내용을 입력해 주세요.');if(!startDate||!end||end<startDate)throw new Error('일정 날짜 범위를 확인해 주세요.');const {data,error}=await client.from('events').update({name:clean,start_date:startDate,end_date:end}).eq('id',id).eq('user_id',uid()).select().single();fail(error,'일정 수정');return data}
  async function toggleEvent(id,done){const {data,error}=await client.from('events').update({done:!!done}).eq('id',id).eq('user_id',uid()).select().single();fail(error,'일정 변경');return data}
  async function deleteEvent(id){const {error}=await client.from('events').delete().eq('id',id).eq('user_id',uid());fail(error,'일정 삭제')}

  async function listHabits(){const {data,error}=await client.from('habits').select('*').eq('user_id',uid()).eq('active',true).order('created_at');fail(error,'체크리스트 불러오기');return data||[]}
  async function addHabit(name,schedule={type:'daily'}){const clean=String(name||'').trim().slice(0,120);if(!clean)throw new Error('체크리스트 이름을 입력해 주세요.');const {data,error}=await client.from('habits').insert({user_id:uid(),name:clean,schedule,active:true}).select().single();fail(error,'체크리스트 추가');return data}
  async function updateHabit(id,name,schedule){const clean=String(name||'').trim().slice(0,120);if(!clean)throw new Error('체크리스트 이름을 입력해 주세요.');const {data,error}=await client.from('habits').update({name:clean,schedule}).eq('id',id).eq('user_id',uid()).select().single();fail(error,'체크리스트 수정');return data}
  async function deleteHabit(id){const {error}=await client.from('habits').delete().eq('id',id).eq('user_id',uid());fail(error,'체크리스트 삭제')}
  async function checksForRange(start,end){const {data,error}=await client.from('habit_checks').select('*').eq('user_id',uid()).gte('day',start).lte('day',end);fail(error,'체크 기록 불러오기');return data||[]}
  async function setHabitCheck(habitId,day,completed){const {data,error}=await client.from('habit_checks').upsert({user_id:uid(),habit_id:habitId,day,completed:!!completed},{onConflict:'habit_id,day'}).select().single();fail(error,'체크 저장');return data}

  async function loadGoals(d=new Date()){const mk=monthKey(d);const {data,error}=await client.from('goals').select('*').eq('user_id',uid()).or(`and(kind.eq.final,period_key.eq.),and(kind.eq.monthly,period_key.eq.${mk})`);fail(error,'목표 불러오기');return data||[]}
  async function saveGoals(finalTitle,deadline,monthlyTitle,d=new Date()){
    const mk=monthKey(d),rows=[{user_id:uid(),kind:'final',period_key:'',title:finalTitle||'',deadline:deadline||null},{user_id:uid(),kind:'monthly',period_key:mk,title:monthlyTitle||'',deadline:null}];
    const {data,error}=await client.from('goals').upsert(rows,{onConflict:'user_id,kind,period_key'}).select();fail(error,'목표 저장');return data||[];
  }

  async function listProjects(){const {data,error}=await client.from('projects').select('*').eq('user_id',uid()).order('updated_at',{ascending:false});fail(error,'프로젝트 불러오기');return data||[]}
  async function addProject(payload){const title=String(payload.title||'').trim().slice(0,120);if(!title)throw new Error('프로젝트 이름을 입력해 주세요.');const progress=Math.max(0,Math.min(100,Number(payload.progress)||0));const {data,error}=await client.from('projects').insert({user_id:uid(),title,summary:String(payload.summary||'').slice(0,1200),status:payload.status||'active',progress}).select().single();fail(error,'프로젝트 만들기');return data}
  async function updateProject(id,patch){const allowed={};['title','summary','status','role','period','project_type','contribution','problem','process','result','learning'].forEach(k=>{if(patch[k]!==undefined)allowed[k]=patch[k]});if(patch.progress!==undefined)allowed.progress=Math.max(0,Math.min(100,Number(patch.progress)||0));if(patch.skills!==undefined)allowed.skills=parseTags(patch.skills);const {data,error}=await client.from('projects').update(allowed).eq('id',id).eq('user_id',uid()).select().single();fail(error,'프로젝트 저장');return data}
  async function deleteProject(id){const {error}=await client.from('projects').delete().eq('id',id).eq('user_id',uid());fail(error,'프로젝트 삭제')}
  async function listProjectFiles(projectId){const {data,error}=await client.from('project_files').select('*').eq('project_id',projectId).eq('user_id',uid()).order('created_at',{ascending:false});fail(error,'프로젝트 과정 파일 불러오기');return data||[]}
  async function addProjectFile(payload){const {data,error}=await client.from('project_files').insert({project_id:payload.project_id,user_id:uid(),storage_path:payload.storage_path,original_name:String(payload.original_name||'').slice(0,255),mime_type:payload.mime_type||null,size_bytes:payload.size_bytes||null}).select().single();fail(error,'프로젝트 과정 파일 저장');return data}
  async function deleteProjectFile(id){const {data,error}=await client.from('project_files').delete().eq('id',id).eq('user_id',uid()).select().maybeSingle();fail(error,'프로젝트 과정 파일 삭제');return data}

  async function listIdeas(){const {data,error}=await client.from('ideas').select('*').eq('user_id',uid()).order('updated_at',{ascending:false});fail(error,'아이디어 불러오기');return data||[]}
  async function addIdea(payload){const title=String(payload.title||'').trim().slice(0,120);if(!title)throw new Error('아이디어 제목을 입력해 주세요.');const body=String(payload.body||'').slice(0,5000),next=String(payload.next_step||'').slice(0,1000);const {data,error}=await client.from('ideas').insert({user_id:uid(),title,body,next_step:next,status:(body||next)?'developing':'idea'}).select().single();fail(error,'아이디어 저장');return data}
  async function deleteIdea(id){const {error}=await client.from('ideas').delete().eq('id',id).eq('user_id',uid());fail(error,'아이디어 삭제')}
  async function convertIdea(id){
    const {data:idea,error:e1}=await client.from('ideas').select('*').eq('id',id).eq('user_id',uid()).single();fail(e1,'아이디어 확인');
    if(idea.project_id)return idea.project_id;
    const {data:project,error:e2}=await client.from('projects').insert({user_id:uid(),title:idea.title,summary:idea.body||'아이디어에서 시작한 프로젝트',problem:idea.body||'',process:idea.next_step?`아이디어 단계의 다음 행동: ${idea.next_step}`:'',status:'active'}).select().single();fail(e2,'프로젝트 전환');
    const {error:e3}=await client.from('ideas').update({status:'converted',project_id:project.id}).eq('id',id).eq('user_id',uid());fail(e3,'아이디어 연결');return project.id;
  }

  async function listWorks(){const {data,error}=await client.from('works').select('*').eq('user_id',uid()).order('created_at',{ascending:false});fail(error,'작업물 불러오기');return data||[]}
  async function addWork(payload){const title=String(payload.title||'').trim().slice(0,120);if(!title)throw new Error('작업물 제목을 입력해 주세요.');const {data,error}=await client.from('works').insert({user_id:uid(),category:payload.category||'기타',title,description:String(payload.description||'').slice(0,1500),link:String(payload.link||'').slice(0,2000),file_path:payload.file_path||null,file_name:payload.file_name||null,file_size:payload.file_size??null,file_type:payload.file_type||null}).select().single();fail(error,'작업물 저장');return data}
  async function deleteWork(id){const {data,error}=await client.from('works').delete().eq('id',id).eq('user_id',uid()).select().maybeSingle();fail(error,'작업물 삭제');return data}
  async function updateWork(id,payload){const title=String(payload.title||'').trim().slice(0,120);if(!title)throw new Error('작업물 제목을 입력해 주세요.');const {data,error}=await client.from('works').update({category:payload.category||'기타',title,description:String(payload.description||'').slice(0,1500),link:String(payload.link||'').slice(0,2000)}).eq('id',id).eq('user_id',uid()).select().single();fail(error,'작업물 수정');return data}

  async function listFinance(){const {data,error}=await client.from('finance_transactions').select('*').eq('user_id',uid()).order('tx_date',{ascending:false}).order('created_at',{ascending:false});fail(error,'가계부 불러오기');return data||[]}
  async function addFinance(payload){const title=String(payload.title||'').trim().slice(0,120),amount=Number(payload.amount);if(!title)throw new Error('가계부 내용을 입력해 주세요.');if(!['expense','income','balance'].includes(payload.tx_type))throw new Error('가계부 종류가 올바르지 않습니다.');if(!Number.isFinite(amount)||amount<0)throw new Error('금액을 확인해 주세요.');const {data,error}=await client.from('finance_transactions').insert({user_id:uid(),tx_type:payload.tx_type,amount,title,category:String(payload.category||'기타').slice(0,80),tx_date:payload.tx_date||today()}).select().single();fail(error,'가계부 저장');return data}
  async function deleteFinance(id){const {error}=await client.from('finance_transactions').delete().eq('id',id).eq('user_id',uid());fail(error,'가계부 삭제')}
  async function updateFinance(id,payload){const title=String(payload.title||'').trim().slice(0,120),amount=Number(payload.amount);if(!title||!Number.isFinite(amount)||amount<0)throw new Error('가계부 내용을 확인해 주세요.');const {data,error}=await client.from('finance_transactions').update({tx_type:payload.tx_type,amount,title,category:String(payload.category||'기타').slice(0,80),tx_date:payload.tx_date||today()}).eq('id',id).eq('user_id',uid()).select().single();fail(error,'가계부 수정');return data}

  async function getSource(type,id){const table=type==='record'?'records':type==='project'?'projects':type==='work'?'works':null;if(!table)throw new Error('공유할 수 없는 항목입니다.');let q=client.from(table).select(type==='record'?'*,record_media(*)':'*').eq('id',id).eq('user_id',uid()).single();const {data,error}=await q;fail(error,'공유 원본 불러오기');return data}
  async function upsertPublication(payload){
    await updateProfile({public_profile:true});
    const row={user_id:uid(),source_type:payload.source_type,source_id:payload.source_id,audience:payload.audience||'public',title:payload.title,body:payload.body||'',meta:payload.meta||{},cover_path:payload.cover_path||null,published_at:new Date().toISOString()};
    const {data,error}=await client.from('publications').upsert(row,{onConflict:'user_id,source_type,source_id'}).select().single();fail(error,'광장 공유');return data;
  }
  async function getPublicationForSource(type,id){const {data,error}=await client.from('publications').select('*').eq('user_id',uid()).eq('source_type',type).eq('source_id',id).maybeSingle();fail(error,'공유 상태 확인');return data}
  async function listOwnPublications(){const {data,error}=await client.from('publications').select('*').eq('user_id',uid());fail(error,'공유 목록 확인');return data||[]}
  async function unpublish(type,id){const {data,error}=await client.from('publications').delete().eq('user_id',uid()).eq('source_type',type).eq('source_id',id).select();fail(error,'공유 취소');return data?.[0]||null}
  async function feed(mode='discover'){const {data,error}=await client.rpc('get_publication_feed',{p_mode:mode,p_limit:50});fail(error,'광장 불러오기');return data||[]}
  async function toggleFollow(target,currently){if(currently){const {error}=await client.from('follows').delete().eq('follower_id',uid()).eq('following_id',target);fail(error,'팔로우 취소');return false}else{const {error}=await client.from('follows').insert({follower_id:uid(),following_id:target});fail(error,'팔로우');return true}}
  async function toggleLike(pubId,currently){if(currently){const {error}=await client.from('publication_likes').delete().eq('publication_id',pubId).eq('user_id',uid());fail(error,'좋아요 취소');return false}else{const {error}=await client.from('publication_likes').insert({publication_id:pubId,user_id:uid()});fail(error,'좋아요');return true}}
  async function comments(pubId){const {data,error}=await client.rpc('get_publication_comments',{p_publication:pubId});fail(error,'피드백 불러오기');return data||[]}
  async function addComment(pubId,body){const {data,error}=await client.from('publication_comments').insert({publication_id:pubId,user_id:uid(),body}).select().single();fail(error,'피드백 등록');return data}
  async function deleteComment(id){const {error}=await client.from('publication_comments').delete().eq('id',id);fail(error,'피드백 삭제')}
  async function blockUser(targetUserId){const target=String(targetUserId||'');if(!target||target===uid())throw new Error('차단할 수 없는 사용자입니다.');const {error}=await client.from('blocks').insert({blocker_id:uid(),blocked_id:target});if(error&&error.code!=='23505')fail(error,'사용자 차단');return true}
  async function unblockUser(targetUserId){const {error}=await client.from('blocks').delete().eq('blocker_id',uid()).eq('blocked_id',targetUserId);fail(error,'차단 해제');return true}
  async function blockedUsers(){const {data,error}=await client.rpc('get_blocked_users');fail(error,'차단 목록 불러오기');return data||[]}
  async function reportContent(payload){
    const row={reporter_id:uid(),target_type:payload.target_type,target_id:payload.target_id||null,target_user_id:payload.target_user_id||null,reason:payload.reason||'other',details:String(payload.details||'').slice(0,3000)};
    const {data,error}=await client.from('content_reports').insert(row).select().single();fail(error,'신고 접수');return data;
  }

  async function features(){const {data,error}=await client.rpc('get_feature_feed',{p_limit:100});fail(error,'개선 제안 불러오기');return data||[]}
  async function addFeature(title,body){const {data,error}=await client.from('feature_requests').insert({user_id:uid(),title,body}).select().single();fail(error,'개선 제안 등록');return data}
  async function toggleFeatureVote(featureId,currently){if(currently){const {error}=await client.from('feature_votes').delete().eq('feature_id',featureId).eq('user_id',uid());fail(error,'공감 취소');return false}else{const {error}=await client.from('feature_votes').insert({feature_id:featureId,user_id:uid()});fail(error,'공감');return true}}
  async function submitSecurityReport(title,body){const {data,error}=await client.from('security_reports').insert({user_id:uid(),title,body}).select().single();fail(error,'보안 제보');return data}

  async function exportData(){
    const specs=[
      ['profiles','id'],['records','user_id'],['record_media','user_id'],['events','user_id'],['habits','user_id'],['habit_checks','user_id'],['goals','user_id'],['projects','user_id'],['ideas','user_id'],['works','user_id'],['finance_transactions','user_id']
    ];
    const out={exported_at:new Date().toISOString(),version:2};
    for(const [table,key] of specs){const {data,error}=await client.from(table).select('*').eq(key,uid());fail(error,`${table} 내보내기`);out[table]=data||[]}
    return out;
  }
  async function deleteAccount(){const {data,error}=await client.functions.invoke('delete-account',{body:{confirm:true}});fail(error,'계정 삭제');return data}

  function legacyValue(snapshot,key,asArray=false){const v=snapshot?.[key];if(v===undefined||v===null)return asArray?[]:'';if(typeof v!=='string')return v;try{return JSON.parse(v)}catch{return asArray?[]:v}}
  function toDateOnly(v){if(!v)return today();const t=Date.parse(v);if(Number.isFinite(t))return new Date(t).toISOString().slice(0,10);const m=String(v).match(/(20\d{2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:today()}
  async function legacyAvailable(){const {data,error}=await client.from('site_state').select('data').eq('user_id',uid()).maybeSingle();if(error)return false;return !!(data?.data&&Object.keys(data.data).length)}
  async function migrateLegacy(){
    const profile=await ensureProfile();if(profile.legacy_migrated_at)throw new Error('이미 기존 데이터 가져오기를 완료했습니다.');
    const {data,error}=await client.from('site_state').select('data').eq('user_id',uid()).maybeSingle();fail(error,'기존 데이터 확인');if(!data?.data)throw new Error('현재 계정에서 기존 데이터를 찾지 못했습니다.');
    const s=data.data,summary={records:0,projects:0,ideas:0,works:0,events:0,finance:0,habits:0};
    const fresh=legacyValue(s,'records',true),diary=legacyValue(s,'diary',true),books=legacyValue(s,'books',true);
    const rr=[...fresh.map(x=>({...x,category:x.category||'생각'})),...diary.map(x=>({...x,category:'일상'})),...books.map(x=>({...x,category:'독서'}))].map((x,i)=>({user_id:uid(),legacy_id:String(x.id??`record-${i}`),category:['일상','생각','독서','회고'].includes(x.category)?x.category:'생각',entry_date:toDateOnly(x.date||x.createdAt),title:String(x.title||`${x.category||'기록'} 기록`).slice(0,120),body:String(x.body||'').slice(0,12000),tags:[]}));
    if(rr.length){const {error:e}=await client.from('records').upsert(rr,{onConflict:'id'});if(e){const {error:e2}=await client.from('records').insert(rr);fail(e2,'기존 기록 가져오기')}summary.records=rr.length}
    const pp=legacyValue(s,'projects',true).map((x,i)=>{const d=x.detail||{};return{user_id:uid(),legacy_id:String(x.uid||x.id||`project-${i}`),title:String(x.title||'기존 프로젝트').slice(0,120),summary:String(d.summary||x.desc||'').slice(0,1200),status:['active','paused','completed'].includes(x.status)?x.status:'active',role:String(d.role||'').slice(0,300),period:String(d.period||'').slice(0,200),project_type:String(d.type||'').slice(0,200),contribution:String(d.contribution||'').slice(0,300),problem:String(d.problem||'').slice(0,8000),process:String(d.process||'').slice(0,12000),result:String(d.result||'').slice(0,8000),learning:String(d.learning||'').slice(0,8000),skills:parseTags(d.skills||'')}});
    if(pp.length){const {error:e}=await client.from('projects').insert(pp);fail(e,'기존 프로젝트 가져오기');summary.projects=pp.length}
    const ii=legacyValue(s,'ideas',true).map((x,i)=>({user_id:uid(),legacy_id:String(x.id||`idea-${i}`),title:String(x.title||'기존 아이디어').slice(0,120),body:String(x.body||'').slice(0,5000),next_step:String(x.nextStep||'').slice(0,1000),status:x.status==='converted'?'converted':(x.body||x.nextStep)?'developing':'idea'}));
    if(ii.length){const {error:e}=await client.from('ideas').insert(ii);fail(e,'기존 아이디어 가져오기');summary.ideas=ii.length}
    const ww=legacyValue(s,'works',true).map((x,i)=>({user_id:uid(),legacy_id:String(x.id||`work-${i}`),category:['과제','발표자료','보고서','글','기타'].includes(x.cat)?x.cat:'기타',title:String(x.title||'기존 작업물').slice(0,120),description:String(x.desc||'').slice(0,1500),link:String(x.link||'').slice(0,2000)}));
    if(ww.length){const {error:e}=await client.from('works').insert(ww);fail(e,'기존 작업물 가져오기');summary.works=ww.length}
    const ee=legacyValue(s,'events',true).map((x,i)=>({user_id:uid(),legacy_id:String(x.id||`event-${i}`),name:String(x.name||'기존 일정').slice(0,300),start_date:toDateOnly(x.startKey||x.key),end_date:toDateOnly(x.endKey||x.key||x.startKey),done:!!x.done}));
    if(ee.length){const {error:e}=await client.from('events').insert(ee);fail(e,'기존 일정 가져오기');summary.events=ee.length}
    const ff=legacyValue(s,'finance_transactions',true).map((x,i)=>({user_id:uid(),legacy_id:String(x.id||`finance-${i}`),tx_type:['expense','income','balance'].includes(x.type)?x.type:'expense',amount:Math.max(0,Number(x.amount)||0),title:String(x.title||x.balanceName||'기존 거래').slice(0,120),category:String(x.category||'기타').slice(0,80),tx_date:toDateOnly(x.date)}));
    if(ff.length){const {error:e}=await client.from('finance_transactions').insert(ff);fail(e,'기존 가계부 가져오기');summary.finance=ff.length}
    const hh=legacyValue(s,'habit_templates',true).map((x,i)=>({user_id:uid(),legacy_id:String(x.id||`habit-${i}`),name:String(x.name||'체크리스트').slice(0,120),schedule:{type:'daily'}}));
    if(hh.length){const {error:e}=await client.from('habits').insert(hh);fail(e,'기존 체크리스트 가져오기');summary.habits=hh.length}
    const fg=legacyValue(s,'final_goal',false),fd=legacyValue(s,'final_goal_deadline',false);if(fg){await client.from('goals').upsert({user_id:uid(),kind:'final',period_key:'',title:String(fg).slice(0,500),deadline:fd||null},{onConflict:'user_id,kind,period_key'})}
    for(const [k,v] of Object.entries(s)){if(!k.startsWith('monthly_goal_')||k.startsWith('monthly_goal_note_'))continue;const m=k.match(/^monthly_goal_(\d{4})_(\d{1,2})$/);if(!m)continue;const mk=`${m[1]}-${String(Number(m[2])+1).padStart(2,'0')}`,title=legacyValue(s,k,false),note=legacyValue(s,`monthly_goal_note_${m[1]}_${m[2]}`,false);if(title)await client.from('goals').upsert({user_id:uid(),kind:'monthly',period_key:mk,title:String(title).slice(0,500),note:String(note||'').slice(0,2000)},{onConflict:'user_id,kind,period_key'})}
    const {error:pe}=await client.from('profiles').update({legacy_migrated_at:new Date().toISOString()}).eq('id',uid());fail(pe,'마이그레이션 완료 표시');return summary;
  }

  window.LabDB={client,getSession,onAuthChange,signIn,signUp,signOut,ensureProfile,updateProfile,completeOnboarding,acceptTerms,dashboard,listRecords,createRecord,updateRecord,deleteRecord,addRecordMedia,removeRecordMedia,reorderRecordMedia,listEventsForMonth,addEvent,updateEvent,toggleEvent,deleteEvent,listHabits,addHabit,updateHabit,deleteHabit,checksForRange,setHabitCheck,loadGoals,saveGoals,listProjects,addProject,updateProject,deleteProject,listProjectFiles,addProjectFile,deleteProjectFile,listIdeas,addIdea,deleteIdea,convertIdea,listWorks,addWork,updateWork,deleteWork,listFinance,addFinance,updateFinance,deleteFinance,getSource,upsertPublication,getPublicationForSource,listOwnPublications,unpublish,feed,toggleFollow,toggleLike,comments,addComment,deleteComment,blockUser,unblockUser,blockedUsers,reportContent,features,addFeature,toggleFeatureVote,submitSecurityReport,exportData,deleteAccount,legacyAvailable,migrateLegacy,user:()=>currentUser,today,dateKey,monthKey};
})();
