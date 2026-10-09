'use strict';
(function(){
  const tiers=['none','simple','spectrum','blossom','crown'];
  const colors=['sage','rose','sky','lilac','gold','rainbow'];
  const safeTier=value=>tiers.includes(value)?value:'none';
  const safeColor=value=>colors.includes(value)?value:'sage';
  const flower=(x,y,scale,angle=0)=>`<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><path class="frame-leaf" d="M-10 4 Q-17 -5 -9 -9 Q-3 -6 -10 4ZM10 5 Q17 -3 11 -8 Q4 -5 10 5Z"/><g class="frame-petals"><ellipse cx="0" cy="-7" rx="3.1" ry="5.1"/><ellipse cx="6.7" cy="-2.2" rx="3.1" ry="5.1" transform="rotate(72 6.7 -2.2)"/><ellipse cx="4.1" cy="5.8" rx="3.1" ry="5.1" transform="rotate(144 4.1 5.8)"/><ellipse cx="-4.1" cy="5.8" rx="3.1" ry="5.1" transform="rotate(216 -4.1 5.8)"/><ellipse cx="-6.7" cy="-2.2" rx="3.1" ry="5.1" transform="rotate(288 -6.7 -2.2)"/></g><circle class="frame-center" r="2.8"/></g>`;
  const leaf=(x,y,a)=>`<ellipse class="frame-leaf" cx="${x}" cy="${y}" rx="3.3" ry="6.7" transform="rotate(${a} ${x} ${y})"/>`;
  function art(tier){
    if(tier==='blossom')return `<svg class="avatar-frame-art" viewBox="0 0 100 100" aria-hidden="true"><path class="frame-stem" d="M69 4 Q101 16 99 45 M4 68 Q13 88 32 96"/>${flower(85,15,.68,-18)}${flower(96,30,.92,16)}${flower(91,45,.57,28)}${flower(18,87,.42,-18)}</svg>`;
    if(tier==='crown')return `<svg class="avatar-frame-art" viewBox="0 0 100 100" aria-hidden="true"><path class="frame-stem" d="M18 78 Q-1 55 11 29 M82 78 Q101 55 89 29"/>${[0,1,2,3,4].map(i=>leaf(12-i*.8,67-i*9,-52+i*11)+leaf(88+i*.8,67-i*9,52-i*11)).join('')}<path class="frame-crown" d="M30 4 35 -10 44 1 50 -15 56 1 65 -10 70 4 68 13 Q50 18 32 13Z"/><path class="frame-crown-base" d="M32 12 Q50 16 68 12 L67 18 Q50 22 33 18Z"/><circle class="frame-gem" cx="50" cy="7" r="2.4"/></svg>`;
    return '';
  }
  function decorate(element,tier,color){
    if(!element)return;
    const chosen=safeTier(tier),palette=safeColor(color);
    element.dataset.frameTier=chosen;element.dataset.frameColor=palette;
    element.querySelector('.avatar-frame-art')?.remove();
    if(chosen==='blossom'||chosen==='crown')element.insertAdjacentHTML('beforeend',art(chosen));
  }
  window.HaruAvatarFrame={tiers,colors,safeTier,safeColor,art,decorate};
})();
