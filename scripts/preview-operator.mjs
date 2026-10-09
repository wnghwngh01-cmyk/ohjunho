// Local-only UI fixture; never copied into dist or served by production routes.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const fixture=`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'11111111-1111-4111-8111-111111111111'}}}}),onAuthStateChange:()=>{},signOut:async()=>({})},storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:path}})})},rpc:async(name,args)=>{if(name==='operator_access')return{data:{operator:true,verified:true}};if(name==='operator_action')return{data:{ok:true}};if(args.p_kind==='dashboard')return{data:{users:128,posts:342,tickets:12,reports:4,restrictions:2}};const common={id:'22222222-2222-4222-8222-222222222222',user_id:'33333333-3333-4333-8333-333333333333',display_name:'하루 사용자',email:'sample@example.invalid',title:'사진을 여러 장 올릴 때 화면이 멈춰요',body:'일기에 사진을 여섯 장 선택하고 저장했는데 화면이 계속 로딩 중으로 표시됩니다. 앱을 다시 열면 기록은 남아 있어요.',created_at:'2026-10-07T05:00:00Z',case_status:'open'};return{data:args.p_search==='없는검색'?[]:Array.from({length:3},(_,i)=>({...common,title:i===0?common.title:i===1?'차분히 정리한 오늘의 기록':'게시물 확인 요청'}))}}})};`;
http.createServer(async(req,res)=>{try{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(path==='/operator-install.sql'){const names=['step13_operator_console.sql','step14_operator_accounts.sql','step15_operator_moderation_hardening.sql','operator_owner.sql'];const parts=await Promise.all(names.map(async n=>'-- '+n+'\n'+(await readFile(resolve(root,'supabase',n),'utf8')).replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')));res.setHeader('Content-Type','text/plain; charset=utf-8');return res.end('begin;\n'+parts.join('\n')+'\ncommit;');}
 if(path==='/operator-fixture-sdk.js'){res.setHeader('Content-Type','application/javascript');return res.end(fixture);}
 const file=resolve(root,'.'+(path==='/'?'/admin.html':path==='/admin-preview.html'?'/admin.html':path));
 if(!file.startsWith(root+sep)){res.writeHead(403);return res.end();}
 let data=await readFile(file);if(path==='/admin-preview.html')data=Buffer.from(data.toString().replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.min.js','/operator-fixture-sdk.js').replace('운영자 전용','로컬 샘플'));
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.ts':'text/plain; charset=utf-8','.sql':'text/plain; charset=utf-8'})[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(4174,'127.0.0.1',()=>console.log('Operator preview: http://127.0.0.1:4174/admin-preview.html (sample data only)'));
