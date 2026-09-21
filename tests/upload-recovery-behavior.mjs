import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../js/storage.js',import.meta.url),'utf8');

function createHarness({failUploadAt=Infinity,delayFirst=false}={}){
  let uploadCount=0;
  const removedPaths=[],deletedRows=[],addedRows=[];
  let releaseUpload;
  const firstGate=new Promise(resolve=>{releaseUpload=resolve});
  const storageApi={
    async upload(path){
      uploadCount+=1;
      if(delayFirst&&uploadCount===1)await firstGate;
      if(uploadCount===failUploadAt)return {error:{message:'forced upload failure'}};
      return {error:null};
    },
    async remove(paths){removedPaths.push(...paths);return {error:null}},
    createSignedUrl:async()=>({data:{signedUrl:'signed'},error:null}),
    download:async()=>({data:new Blob(),error:null}),
    getPublicUrl:()=>({data:{publicUrl:'public'}})
  };
  const db={
    client:{storage:{from:()=>storageApi}},
    user:()=>({id:'11111111-1111-4111-8111-111111111111'}),
    async addProjectFile(row){const saved={...row,id:`row-${addedRows.length+1}`};addedRows.push(saved);return saved},
    async deleteProjectFile(id){deletedRows.push(id)},
    async addRecordMedia(row){return {...row,id:'media'}},
    async removeRecordMedia(){}
  };
  const context={
    window:{LAB_CONFIG:{MAX_DOCUMENT_BYTES:20*1024*1024,MAX_IMAGE_BYTES:12*1024*1024,RECORD_IMAGE_LIMIT:6,IMAGE_MAX_EDGE:2000,PRIVATE_BUCKET:'private',PUBLIC_BUCKET:'public'},LabDB:db},
    crypto:{randomUUID:()=>`uuid-${uploadCount+1}`},Blob,File,Promise,Map,Set,Error,String,Math,Date
  };
  vm.runInNewContext(source,context);
  return {storage:context.window.LabStorage,removedPaths,deletedRows,addedRows,get uploadCount(){return uploadCount},releaseUpload};
}

const files=[
  new File(['a'],'one.txt',{type:'text/plain'}),
  new File(['b'],'two.txt',{type:'text/plain'}),
  new File(['c'],'three.txt',{type:'text/plain'})
];

const failed=createHarness({failUploadAt:3});
await assert.rejects(failed.storage.uploadProjectFiles('project-a',files),/forced upload failure/);
assert.deepEqual(failed.deletedRows,['row-1','row-2'],'실패 전에 저장된 DB 파일 행을 모두 되돌려야 합니다.');
assert.equal(failed.removedPaths.length,2,'DB에 연결되지 않은 Storage 파일 두 개를 정리해야 합니다.');

const concurrent=createHarness({delayFirst:true});
const first=concurrent.storage.uploadProjectFiles('project-b',[files[0]]);
const second=concurrent.storage.uploadProjectFiles('project-b',[files[0]]);
await Promise.resolve();
concurrent.releaseUpload();
const [firstRows,secondRows]=await Promise.all([first,second]);
assert.equal(concurrent.uploadCount,1,'같은 프로젝트의 동시 업로드는 Storage 요청을 한 번만 보내야 합니다.');
assert.equal(concurrent.addedRows.length,1,'같은 프로젝트의 동시 업로드는 DB 행을 한 번만 만들어야 합니다.');
assert.equal(firstRows[0].id,secondRows[0].id,'중복 호출은 진행 중인 동일 결과를 공유해야 합니다.');

console.log('upload recovery behavior: PASS');
