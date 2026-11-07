'use strict';
(function(){
  const tiers=['none','simple','spectrum','blossom','crown'];
  const colors=['sage','rose','sky','lilac','gold','rainbow'];
  const requirements=Object.freeze({none:0,simple:0,spectrum:1000,blossom:5000,crown:10000});
  const safeTier=value=>tiers.includes(value)?value:'none';
  const colorsFor=()=>[...colors];
  const safeColor=(value,tier='none')=>colorsFor(tier).includes(value)?value:'sage';
  const safeCrownColor=value=>colors.includes(value)?value:'';

  // Color Palettes: [lightHighlight, mainMid, deepShadow, darkStroke]
  const SWATCHES={
    sage:['#dfeee4','#6b9a83','#3f6a56','#233e32'],
    rose:['#fae4e8','#c97480','#8f3f4d','#4e1d26'],
    sky:['#e2f2f9','#639ab8','#356785','#1b394b'],
    lilac:['#efe6fa','#9573bc','#5c3d82','#311d4a'],
    gold:['#fff5d6','#d8aa4c','#96681c','#4f3308'],
    rainbow:['#f3a6b8','#f2cf8d','#96d1b1','#89bde0','#b39ddb']
  };

  let uid=0;
  function stopsFor(colorKey){
    if(colorKey==='rainbow'){
      const r=SWATCHES.rainbow;
      return `<stop offset="0%" stop-color="${r[0]}"/><stop offset="25%" stop-color="${r[1]}"/><stop offset="50%" stop-color="${r[2]}"/><stop offset="75%" stop-color="${r[3]}"/><stop offset="100%" stop-color="${r[4]}"/>`;
    }
    const p=SWATCHES[colorKey]||SWATCHES.sage;
    return `<stop offset="0%" stop-color="${p[0]}"/><stop offset="45%" stop-color="${p[1]}"/><stop offset="100%" stop-color="${p[2]}"/>`;
  }
  function strokeFor(colorKey){
    if(colorKey==='rainbow')return '#5d4d6e';
    return (SWATCHES[colorKey]||SWATCHES.sage)[3];
  }

  function buildFrameSvg(tier,color,accent){
    const chosenTier=safeTier(tier);
    if(!['spectrum','blossom','crown'].includes(chosenTier))return '';
    const mainColor=safeColor(color,chosenTier);
    const subColor=safeCrownColor(accent)|| (chosenTier==='crown'?'gold':chosenTier==='blossom'?'rose':mainColor);
    const id=`hf_${++uid}_${chosenTier}`;
    const mainStroke=strokeFor(mainColor);
    const subStroke=strokeFor(subColor);

    const defs=`<defs>
      <linearGradient id="${id}_main" x1="0%" y1="0%" x2="100%" y2="100%">${stopsFor(mainColor)}</linearGradient>
      <linearGradient id="${id}_sub" x1="0%" y1="0%" x2="100%" y2="100%">${stopsFor(subColor)}</linearGradient>
      <linearGradient id="${id}_shine" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1"/>
      </linearGradient>
      <filter id="${id}_drop" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#14201a" flood-opacity="0.24"/>
      </filter>
    </defs>`;

    if(chosenTier==='spectrum'){
      // 1,000원 리본 프레임: 유려한 이중 새틴 리본 링 + 하단 중앙의 입체 리본 매듭(Bow Knot)과 테일
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="avatar-frame-svg tier-spectrum" aria-hidden="true">${defs}
        <g filter="url(#${id}_drop)">
          <circle cx="60" cy="60" r="46.5" fill="none" stroke="url(#${id}_main)" stroke-width="5.2"/>
          <circle cx="60" cy="60" r="44.2" fill="none" stroke="url(#${id}_shine)" stroke-width="1"/>
          <circle cx="60" cy="60" r="49" fill="none" stroke="${mainStroke}" stroke-width="0.7" opacity="0.55"/>
          <path d="M54 104 C47 112, 40 116, 34 114 L38 107 L31 106 C38 101, 46 100, 54 101 Z" fill="url(#${id}_main)" stroke="${mainStroke}" stroke-width="0.9" stroke-linejoin="round"/>
          <path d="M66 104 C73 112, 80 116, 86 114 L82 107 L89 106 C82 101, 74 100, 66 101 Z" fill="url(#${id}_main)" stroke="${mainStroke}" stroke-width="0.9" stroke-linejoin="round"/>
          <path d="M58 101 C45 92, 34 96, 36 104 C38 110, 49 108, 58 103 Z" fill="url(#${id}_main)" stroke="${mainStroke}" stroke-width="1" stroke-linejoin="round"/>
          <path d="M62 101 C75 92, 86 96, 84 104 C82 110, 71 108, 62 103 Z" fill="url(#${id}_main)" stroke="${mainStroke}" stroke-width="1" stroke-linejoin="round"/>
          <path d="M54 99 C45 96, 39 98, 40 102" fill="none" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" opacity="0.75"/>
          <path d="M66 99 C75 96, 81 98, 80 102" fill="none" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" opacity="0.75"/>
          <rect x="55.5" y="97.5" width="9" height="8" rx="3.2" fill="url(#${id}_sub)" stroke="${mainStroke}" stroke-width="1"/>
          <circle cx="60" cy="101.5" r="1.6" fill="#ffffff" opacity="0.85"/>
        </g>
      </svg>`;
    }

    if(chosenTier==='blossom'){
      // 5,000원 블라썸 꽃장식 프레임: 세련된 보태니컬 가드 링 + 우측 상단/좌측 하단 5잎 벚꽃 클러스터와 잎사귀
      const flower=(cx,cy,sc,rot=0)=>{
        let petals='';
        for(let i=0;i<5;i++){
          const a=i*72+rot;
          petals+=`<path d="M0,0 C-4.5,-5 -6,-12 -2.2,-14.5 C-0.8,-15.4 0,-13.4 0,-13.4 C0,-13.4 0.8,-15.4 2.2,-14.5 C6,-12 4.5,-5 0,0 Z" transform="rotate(${a})" fill="url(#${id}_sub)" stroke="${subStroke}" stroke-width="0.85" stroke-linejoin="round"/>`;
        }
        return `<g transform="translate(${cx} ${cy}) scale(${sc})">
          <path d="M-11,3 C-17,1 -20,-4 -15,-8 C-10,-11 -5,-5 -11,3 Z" fill="#5e9476" stroke="#284937" stroke-width="0.8"/>
          <path d="M11,-3 C17,-1 20,4 15,8 C10,11 5,5 11,-3 Z" fill="#77ad8e" stroke="#284937" stroke-width="0.8"/>
          ${petals}
          <circle cx="0" cy="0" r="2.8" fill="#ffe484" stroke="#9e6b18" stroke-width="0.7"/>
          <circle cx="-1" cy="-1" r="0.9" fill="#ffffff"/>
        </g>`;
      };
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="avatar-frame-svg tier-blossom" aria-hidden="true">${defs}
        <g filter="url(#${id}_drop)">
          <circle cx="60" cy="60" r="46.5" fill="none" stroke="url(#${id}_main)" stroke-width="4.6"/>
          <circle cx="60" cy="60" r="44.4" fill="none" stroke="url(#${id}_shine)" stroke-width="0.9"/>
          <circle cx="60" cy="60" r="49" fill="none" stroke="${mainStroke}" stroke-width="0.65" opacity="0.5"/>
          ${flower(92,24,0.92,18)}
          ${flower(102,41,0.58,-15)}
          ${flower(27,94,0.82,-24)}
          ${flower(18,78,0.52,12)}
        </g>
      </svg>`;
    }

    // 10,000원 황금 왕관·월계관 프레임 (crown): 내부 사진을 축소하거나 가리지 않고 원형 외곽을 감싸는 월계수 잎 + 상단 중앙 5각 왕관
    let leaves='';
    for(let i=0;i<7;i++){
      const deg=152 - i*19; // 좌/우 대칭 월계수 아치
      const rad=deg*Math.PI/180;
      const r=47.2;
      const lx=60 - Math.sin(rad)*r, ly=60 + Math.cos(rad)*r;
      const rx=60 + Math.sin(rad)*r, ry=60 + Math.cos(rad)*r;
      const lRot=-deg+28, rRot=deg-28;
      leaves+=`<g transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${lRot.toFixed(1)})">
        <path d="M0,0 C-4,-3 -5,-9 0,-13 C5,-9 4,-3 0,0 Z" fill="url(#${id}_main)" stroke="${mainStroke}" stroke-width="0.75"/>
        <path d="M0,-1 L0,-10" stroke="#ffffff" stroke-width="0.55" opacity="0.65"/>
      </g>`;
      leaves+=`<g transform="translate(${rx.toFixed(1)} ${ry.toFixed(1)}) rotate(${rRot.toFixed(1)})">
        <path d="M0,0 C-4,-3 -5,-9 0,-13 C5,-9 4,-3 0,0 Z" fill="url(#${id}_main)" stroke="${mainStroke}" stroke-width="0.75"/>
        <path d="M0,-1 L0,-10" stroke="#ffffff" stroke-width="0.55" opacity="0.65"/>
      </g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="avatar-frame-svg tier-crown" aria-hidden="true">${defs}
      <g filter="url(#${id}_drop)">
        <circle cx="60" cy="60" r="46.2" fill="none" stroke="url(#${id}_main)" stroke-width="4.4"/>
        <circle cx="60" cy="60" r="44.2" fill="none" stroke="url(#${id}_shine)" stroke-width="0.9"/>
        ${leaves}
        <path d="M52,107 C56,104 64,104 68,107 C64,111 56,111 52,107 Z" fill="url(#${id}_sub)" stroke="${subStroke}" stroke-width="0.8"/>
        <g transform="translate(60 11.5)">
          <path d="M-16,6 L-19,-6 L-9,0 L0,-10 L9,0 L19,-6 L16,6 Q0,3.5 -16,6 Z" fill="url(#${id}_sub)" stroke="${subStroke}" stroke-width="1" stroke-linejoin="round"/>
          <path d="M-15,6.2 Q0,4 15,6.2 L14,9.2 Q0,7 -14,9.2 Z" fill="url(#${id}_main)" stroke="${subStroke}" stroke-width="0.85"/>
          <circle cx="-19" cy="-6.5" r="1.6" fill="#ffffff" stroke="${subStroke}" stroke-width="0.6"/>
          <circle cx="-9" cy="-0.5" r="1.4" fill="#ffffff" stroke="${subStroke}" stroke-width="0.6"/>
          <circle cx="0" cy="-10.8" r="2" fill="#ffffff" stroke="${subStroke}" stroke-width="0.6"/>
          <circle cx="9" cy="-0.5" r="1.4" fill="#ffffff" stroke="${subStroke}" stroke-width="0.6"/>
          <circle cx="19" cy="-6.5" r="1.6" fill="#ffffff" stroke="${subStroke}" stroke-width="0.6"/>
          <circle cx="0" cy="-1.5" r="1.9" fill="#ffffff" opacity="0.9"/>
        </g>
      </g>
    </svg>`;
  }

  function art(tier,color='sage',crownColor=''){
    const chosen=safeTier(tier);
    if(!['spectrum','blossom','crown'].includes(chosen))return '';
    return `<haru-avatar-art class="avatar-frame-art" data-tier="${chosen}" aria-hidden="true">${buildFrameSvg(chosen,color,crownColor)}</haru-avatar-art>`;
  }

  function decorate(element,tier,color,crownColor=''){
    if(!element)return;
    const chosen=safeTier(tier),c=safeColor(color,chosen),cc=['crown','blossom'].includes(chosen)?safeCrownColor(crownColor):'';
    element.dataset.frameTier=chosen;
    element.dataset.frameColor=c;
    element.dataset.frameCrownColor=cc;
    element.querySelector('.avatar-frame-art')?.remove();
    element.insertAdjacentHTML('beforeend',art(chosen,c,cc));
  }

  const palettes={sage:[150,.27],rose:[354,.46],sky:[205,.42],lilac:[266,.38],gold:[39,.48]};
  const rainbow=[[8,.52],[46,.55],[144,.34],[201,.48],[272,.40]];
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
    const out=new Uint8ClampedArray(data||[]),secondary=safeCrownColor(accent)||color;
    if(!regions||!size)return out;
    for(let i=0;i<out.length;i+=4){
      if(!out[i+3])continue;
      const pixel=i/4,x=pixel%size,y=Math.floor(pixel/size),r=data[i],g=data[i+1],b=data[i+2],region=regions[pixel];
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

  if(typeof customElements!=='undefined'&&typeof HTMLElement!=='undefined'&&!customElements.get('haru-avatar-art')){
    customElements.define('haru-avatar-art',class extends HTMLElement{
      connectedCallback(){
        const avatar=this.closest('.avatar'),tier=safeTier(this.dataset.tier);
        if(!avatar||!['spectrum','blossom','crown'].includes(tier))return;
        const color=safeColor(avatar.dataset.frameColor,tier),accent=safeCrownColor(avatar.dataset.frameCrownColor);
        this.innerHTML=buildFrameSvg(tier,color,accent);
        this.dataset.renderState='ready';
      }
    });
  }

  const unlockedTiers=total=>tiers.filter(tier=>Number(total||0)>=requirements[tier]);
  const canUseTier=(tier,total)=>Number(total||0)>=requirements[safeTier(tier)];
  const canUseRainbow=total=>Number(total||0)>=5000;
  window.HaruAvatarFrame={tiers,colors,requirements,colorsFor,safeTier,safeColor,safeCrownColor,unlockedTiers,canUseTier,canUseRainbow,art,decorate,recolor,buildFrameSvg};
})();
