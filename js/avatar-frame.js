'use strict';
(function(){
  const tiers=['none','simple','spectrum','blossom','crown'];
  const colors=['sage','rose','sky','lilac','gold','rainbow'];
  const safeTier=value=>tiers.includes(value)?value:'none';
  const colorsFor=tier=>colors.filter(color=>color!=='rainbow'||['spectrum','blossom','crown'].includes(safeTier(tier)));
  const safeColor=(value,tier='none')=>colorsFor(tier).includes(value)?value:'sage';
  function art(tier){
    if(!['spectrum','blossom','crown'].includes(tier))return '';
    return '<span class="avatar-frame-art" aria-hidden="true"></span>';
  }
  function decorate(element,tier,color){
    if(!element)return;
    const chosen=safeTier(tier),palette=safeColor(color,chosen);
    element.dataset.frameTier=chosen;element.dataset.frameColor=palette;
    element.querySelector('.avatar-frame-art')?.remove();
    element.insertAdjacentHTML('beforeend',art(chosen));
  }
  window.HaruAvatarFrame={tiers,colors,colorsFor,safeTier,safeColor,art,decorate};
})();
