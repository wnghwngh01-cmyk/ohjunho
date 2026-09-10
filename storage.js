'use strict';
(function(){
  const cfg=window.LAB_CONFIG,db=()=>window.LabDB,client=()=>db().client;
  function safeName(name){
    const raw=String(name||'file').normalize('NFKD'),dot=raw.lastIndexOf('.'),ext=dot>0?raw.slice(dot+1).toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,10):'';
    let stem=(dot>0?raw.slice(0,dot):raw).replace(/[^\x00-\x7F]/g,'_').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'').slice(0,70);
    if(!stem)stem='file';return ext?`${stem}.${ext}`:stem;
  }
  const extForType=t=>t==='image/webp'?'webp':t==='image/png'?'png':'jpg';
  async function optimizeImage(file){
    if(!file)return null;if(file.size>cfg.MAX_IMAGE_BYTES)throw new Error(`${file.name}: 사진은 장당 12MB 이하만 업로드할 수 있습니다.`);
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type||''))throw new Error(`${file.name}: JPG, PNG, WebP 사진만 지원합니다.`);
    let bitmap;try{bitmap=await createImageBitmap(file)}catch{return file}
    const scale=Math.min(1,cfg.IMAGE_MAX_EDGE/Math.max(bitmap.width,bitmap.height));
    if(scale===1&&file.size<=2.2*1024*1024){bitmap.close?.();return file}
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));if(!blob)return file;
    return new File([blob],`${safeName(file.name).replace(/\.[^.]+$/,'')}.${extForType(blob.type)}`,{type:blob.type,lastModified:Date.now()});
  }
  function uniquePath(kind,name){const u=db().user();if(!u)throw new Error('로그인이 필요합니다.');const rand=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;return `${u.id}/${kind}/${rand}_${safeName(name)}`}
  async function uploadPrivate(file,kind){
    if(!file)return null;if(file.size>cfg.MAX_DOCUMENT_BYTES)throw new Error('파일은 20MB 이하만 업로드할 수 있습니다.');
    const path=uniquePath(kind,file.name),contentType=file.type||'application/octet-stream';
    const {error}=await client().storage.from(cfg.PRIVATE_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType});if(error)throw new Error(`파일 업로드: ${error.message}`);
    return {path,name:file.name,size:file.size,type:contentType};
  }
  async function uploadRecordImages(recordId,files,startOrder=0){
    const arr=[...files];if(arr.length>cfg.RECORD_IMAGE_LIMIT)throw new Error(`사진은 최대 ${cfg.RECORD_IMAGE_LIMIT}장까지 첨부할 수 있습니다.`);
    const saved=[],uploaded=[];
    try{
      for(let i=0;i<arr.length;i++){
        const f=await optimizeImage(arr[i]),meta=await uploadPrivate(f,'records');uploaded.push(meta.path);
        const row=await db().addRecordMedia({record_id:recordId,storage_path:meta.path,original_name:arr[i].name,mime_type:meta.type,size_bytes:meta.size,sort_order:startOrder+i});saved.push(row);
      }
      return saved;
    }catch(e){
      for(const m of saved)await db().removeRecordMedia(m.id).catch(()=>{});
      if(uploaded.length)await client().storage.from(cfg.PRIVATE_BUCKET).remove(uploaded).catch(()=>{});
      throw e;
    }
  }
  async function removeRecordMedia(media){if(!media)return;await db().removeRecordMedia(media.id);const {error}=await client().storage.from(cfg.PRIVATE_BUCKET).remove([media.storage_path]);if(error)throw new Error(`사진 정보는 삭제됐지만 파일 정리에 실패했습니다: ${error.message}`)}
  async function removePrivatePaths(paths){const clean=[...new Set((paths||[]).filter(Boolean))];if(!clean.length)return;const {error}=await client().storage.from(cfg.PRIVATE_BUCKET).remove(clean);if(error)throw new Error(`파일 정리: ${error.message}`)}
  async function signedPrivate(path,seconds=3600){if(!path)return '';const {data,error}=await client().storage.from(cfg.PRIVATE_BUCKET).createSignedUrl(path,seconds);if(error)throw new Error(`파일 열기: ${error.message}`);return data?.signedUrl||''}
  async function signedRecordMedia(mediaList){return Promise.all((mediaList||[]).sort((a,b)=>a.sort_order-b.sort_order).map(async m=>({...m,url:await signedPrivate(m.storage_path,3600)})))}
  async function downloadPrivate(path,name='download'){const {data,error}=await client().storage.from(cfg.PRIVATE_BUCKET).download(path);if(error)throw new Error(`다운로드: ${error.message}`);const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}
  async function copyPrivateToPublic(privatePath,originalName,kind='publication'){
    if(!privatePath)return null;const {data:blob,error:downErr}=await client().storage.from(cfg.PRIVATE_BUCKET).download(privatePath);if(downErr)throw new Error(`공유 파일 읽기: ${downErr.message}`);
    const path=uniquePath(`public/${kind}`,originalName||'shared-file'),contentType=blob.type||'application/octet-stream';
    const {error}=await client().storage.from(cfg.PUBLIC_BUCKET).upload(path,blob,{upsert:false,cacheControl:'3600',contentType});if(error)throw new Error(`공개 사본 업로드: ${error.message}`);return path;
  }
  function publicUrl(path){if(!path)return '';return client().storage.from(cfg.PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl||''}
  async function removePublic(path){if(!path)return;const {error}=await client().storage.from(cfg.PUBLIC_BUCKET).remove([path]);if(error)throw new Error(`공개 사본 삭제: ${error.message}`)}
  async function uploadWorkFile(file){if(!file)return null;return uploadPrivate(file,'works')}

  window.LabStorage={safeName,optimizeImage,uploadPrivate,uploadRecordImages,removeRecordMedia,removePrivatePaths,signedPrivate,signedRecordMedia,downloadPrivate,copyPrivateToPublic,publicUrl,removePublic,uploadWorkFile};
})();
