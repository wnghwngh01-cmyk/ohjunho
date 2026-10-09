import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=(await readFile(new URL('../supabase/functions/operator-account/index.ts',import.meta.url),'utf8')).replace(/^import .*;\r?\n/,'');
const js=stripTypeScriptTypes(source);
const id='22222222-2222-4222-8222-222222222222';
function harness({authenticated=true,authorized=true,failRemove=false,failDelete=false}={}){
 const calls=[];let handler;
 const service={
  auth:{admin:{updateUserById:async(id,payload)=>{calls.push(['auth',id,payload]);return{};},deleteUser:async id=>{calls.push(['delete',id]);return{error:failDelete?new Error('test delete failure'):null};}}},
  storage:{from:bucket=>({list:async(folder,{offset})=>{calls.push(['list',bucket,folder,offset]);const files=folder===id?Array.from({length:151},(_,i)=>({id:`file-${i}`,name:`image-${i}.jpg`})):[];return{data:files.slice(offset,offset+100)};},remove:async paths=>{calls.push(['remove',bucket,paths]);return{error:failRemove?new Error('test failure'):null};}})},
  rpc:async(name,payload)=>{calls.push(['finish',payload]);return{};}
 };
 const caller={auth:{getUser:async()=>({data:{user:authenticated?{id:'owner'}:null},error:null})},rpc:async(name,payload)=>{calls.push(['prepare',payload]);return authorized?{data:42}:{error:{message:'forbidden'}};}};
 vm.runInNewContext(js,{Request,Response,Set,console,Deno:{env:{get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'?'server-secret':'fixture'},serve:fn=>handler=fn},createClient:(url,key)=>key==='server-secret'?service:caller});
 const request=async(action='delete',overrides={})=>handler(new Request('https://fixture.invalid/operator-account',{method:'POST',headers:{Origin:'https://test1.ohjunho.com',Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({action,id,confirmation:id,reason:'approved disposable fixture',...overrides})}));
 return{calls,request,handler};
}
let h=harness({authenticated:false});assert.equal((await h.request()).status,401);assert.equal(h.calls.length,0);
h=harness({authorized:false});assert.equal((await h.request()).status,403);assert(!h.calls.some(x=>x[0]==='auth'));
h=harness();assert.equal((await h.request('delete',{confirmation:'wrong'})).status,400);assert.equal(h.calls.length,0);
h=harness();assert.equal((await h.request('delete')).status,200);assert.equal(h.calls.filter(x=>x[0]==='remove').flatMap(x=>x[2]).length,302);assert(h.calls.findIndex(x=>x[0]==='delete')>h.calls.findLastIndex(x=>x[0]==='remove'));assert.equal(h.calls.at(-1)[1].p_ok,true);
h=harness({failRemove:true});assert.equal((await h.request()).status,500);assert(!h.calls.some(x=>x[0]==='delete'));assert.equal(h.calls.at(-1)[1].p_ok,false);
h=harness({failDelete:true});assert.equal((await h.request()).status,500);assert.equal(h.calls.at(-1)[1].p_ok,false);
h=harness();await h.request('ban');assert.equal(h.calls.find(x=>x[0]==='auth')[2].ban_duration,'168h');assert(!h.calls.some(x=>x[0]==='remove'));
h=harness();await h.request('permanent_ban');assert.equal(h.calls.find(x=>x[0]==='auth')[2].ban_duration,'876000h');
h=harness();await h.request('unban');assert.equal(h.calls.find(x=>x[0]==='auth')[2].ban_duration,'none');
h=harness();const cors=await h.handler(new Request('https://fixture.invalid',{method:'POST',headers:{Origin:'https://untrusted.invalid'}}));assert.equal(cors.status,403);assert.equal(h.calls.length,0);
console.log('PASS operator-account: authentication, authorization, target confirmation, paginated file cleanup, partial failures, bans/unban and CORS (mocked Auth/Storage)');
