'use strict';
(function(){
  const tiers=['none','simple','spectrum','blossom','crown'];
  const colors=['sage','rose','sky','lilac','gold','rainbow'];
  const safeTier=value=>tiers.includes(value)?value:'none';
  const colorsFor=tier=>colors.filter(color=>color!=='rainbow'||['spectrum','blossom','crown'].includes(safeTier(tier)));
  const safeColor=(value,tier='none')=>colorsFor(tier).includes(value)?value:'sage';
  // Legacy database field: secondary ornament color, now also used by blossom.
  const safeCrownColor=value=>colors.includes(value)?value:'';
  const palettes={sage:[150,.27],rose:[354,.46],sky:[205,.42],lilac:[266,.38],gold:[39,.48]};
  const rainbow=[[8,.52],[46,.55],[144,.34],[201,.48],[272,.40]];
  const assets={spectrum:'ribbon-v2.png',blossom:'blossom-v4.png',crown:'crown-v3.png'};
  const flowerPaths=[
    'M844 193C829 153 838 110 876 115C900 114 925 145 931 183C951 145 987 133 1007 153C1027 176 1005 208 981 220C1016 225 1037 254 1025 279C1014 306 970 301 938 279C945 316 924 348 900 343C876 341 859 316 863 283C829 293 789 274 783 251C769 222 801 200 844 193Z',
    'M1011 332C1007 309 1028 288 1048 293C1070 297 1078 322 1077 342C1099 323 1125 322 1138 341C1154 361 1135 384 1114 395C1135 405 1139 429 1122 443C1107 457 1085 445 1072 428C1071 452 1052 467 1036 457C1020 449 1018 427 1025 410C1002 413 978 402 975 382C970 362 984 342 1011 332Z',
    'M1095 477C1084 456 1095 442 1109 445C1124 446 1133 467 1134 482C1150 458 1173 451 1186 468C1199 484 1182 501 1168 509C1190 516 1200 535 1188 550C1176 565 1155 553 1143 542C1143 564 1127 578 1113 570C1097 563 1101 546 1106 534C1085 541 1062 532 1059 516C1054 499 1074 481 1095 477Z',
    'M201 909C196 891 212 875 226 882C241 887 246 906 244 918C263 903 282 905 292 921C302 939 282 951 268 954C285 967 282 990 267 996C252 1002 239 987 232 975C224 996 204 1003 194 991C184 979 193 965 198 958C179 958 162 948 165 933C168 918 184 910 201 909Z',
    'M293 1008C290 994 301 985 312 991C324 995 326 1006 325 1015C339 1007 353 1012 356 1023C360 1036 347 1043 337 1044C345 1056 338 1066 328 1067C317 1067 312 1057 308 1051C296 1064 283 1063 279 1053C274 1043 283 1038 286 1033C274 1031 267 1021 274 1014C279 1008 286 1006 293 1008Z'
  ];
  // Follow the curved lower crown band, rather than a rectangle around it.
  const crownPath='M385 40H870V245L800 281L786 322Q783 329 775 326Q626 286 478 326Q469 330 466 319L453 284L385 247Z';
  function art(tier){return assets[tier]?`<haru-avatar-art class="avatar-frame-art" data-tier="${tier}" aria-hidden="true"></haru-avatar-art>`:''}
  function decorate(element,tier,color,crownColor=''){
    if(!element)return;
    const chosen=safeTier(tier);
    element.dataset.frameTier=chosen;element.dataset.frameColor=safeColor(color,chosen);
    element.dataset.frameCrownColor=['crown','blossom'].includes(chosen)?safeCrownColor(crownColor):'';
    element.querySelector('.avatar-frame-art')?.remove();
    element.insertAdjacentHTML('beforeend',art(chosen));
  }
  function hsl(h,s,l){
    const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))};
    return [f(0),f(8),f(4)];
  }
  function paletteAt(color,t){
    if(color!=='rainbow')return palettes[color]||palettes.sage;
    const pos=Math.max(0,Math.min(1,t))*4,index=Math.min(3,Math.floor(pos)),fraction=pos-index;
    return rainbow[index].map((v,i)=>v+(rainbow[index+1][i]-v)*fraction);
  }
  function recolor(data,regions,size,tier,color,accent){
    const out=new Uint8ClampedArray(data),secondary=safeCrownColor(accent)||color;
    for(let i=0;i<out.length;i+=4){
      if(!out[i+3])continue;
      const pixel=i/4,x=pixel%size,y=Math.floor(pixel/size),r=data[i],g=data[i+1],b=data[i+2],region=regions[pixel];
      // Preserve the botanical greens instead of tinting the entire artwork.
      if(tier==='blossom'&&g>=r*.9&&g>b*1.08)continue;
      if(tier==='blossom'&&region&&r>g&&g>r*.7&&g>b*1.25)continue;
      let chosen=color,t=1-y/size;
      if(tier==='blossom'&&region){chosen=secondary;t=(region-1)/4}
      else if(tier==='crown'&&region){chosen=secondary;t=(x/size-.31)/.38}
      else if(tier==='crown'){t=(.88-y/size)/.66}
      else if(tier==='blossom'){t=(.92-y/size)/.82}
      const [h,s]=paletteAt(chosen,t),l=(Math.max(r,g,b)+Math.min(r,g,b))/510,rgb=hsl(h,s,l);
      out[i]=rgb[0];out[i+1]=rgb[1];out[i+2]=rgb[2];
    }
    return out;
  }
  const originals=new Map(),rendered=new Map(),size=384;
  function load(tier){
    if(originals.has(tier))return originals.get(tier);
    const promise=new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>{try{
        const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,size,size);
        const pixels=ctx.getImageData(0,0,size,size).data,regions=new Uint8Array(size*size);
        const paths=tier==='crown'?[crownPath]:tier==='blossom'?flowerPaths:[];
        paths.forEach((path,index)=>{
          ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/1254,size/1254);ctx.fillStyle='#fff';const shape=new Path2D(path);ctx.fill(shape);if(tier==='blossom'){ctx.strokeStyle='#fff';ctx.lineWidth=16;ctx.stroke(shape)}ctx.restore();
          const mask=ctx.getImageData(0,0,size,size).data;for(let p=0;p<regions.length;p++)if(mask[p*4+3]>127)regions[p]=index+1;
        });
        resolve({pixels,regions});
      }catch(error){originals.delete(tier);reject(error)}
      };image.onerror=()=>{originals.delete(tier);reject(new Error('프로필 테두리 이미지를 불러오지 못했습니다.'))};
      image.src=new URL(`./assets/profile-frames/${assets[tier]}`,document.baseURI).href;
    });originals.set(tier,promise);return promise;
  }
  async function frameCanvas(tier,color,accent){
    const key=[tier,color,accent].join(':');if(rendered.has(key))return rendered.get(key);
    const original=await load(tier),canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    canvas.getContext('2d').putImageData(new ImageData(recolor(original.pixels,original.regions,size,tier,color,accent),size,size),0,0);
    if(rendered.size>=32)rendered.delete(rendered.keys().next().value);rendered.set(key,canvas);return canvas;
  }
  if(typeof customElements!=='undefined'&&typeof HTMLElement!=='undefined'&&!customElements.get('haru-avatar-art')){
    customElements.define('haru-avatar-art',class extends HTMLElement{
      connectedCallback(){
        const avatar=this.closest('.avatar'),tier=safeTier(this.dataset.tier);if(!avatar||!assets[tier])return;
        const color=safeColor(avatar.dataset.frameColor,tier),accent=safeCrownColor(avatar.dataset.frameCrownColor);
        this.dataset.renderState='loading';
        frameCanvas(tier,color,accent).then(source=>{if(!this.isConnected)return;const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(source,0,0);this.replaceChildren(canvas);this.dataset.renderState='ready'}).catch(error=>{if(this.isConnected){console.warn('프로필 테두리 색상 렌더링 실패',error);const img=document.createElement('img');img.src=new URL(`./assets/profile-frames/${assets[tier]}`,document.baseURI).href;img.alt='';this.replaceChildren(img);this.dataset.renderState='fallback'}});
      }
    });
  }
  window.HaruAvatarFrame={tiers,colors,colorsFor,safeTier,safeColor,safeCrownColor,art,decorate,recolor};
})();
