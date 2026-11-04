import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{},document:{querySelector(){return null},querySelectorAll(){return[]}},navigator:{}};
vm.runInNewContext(fs.readFileSync('js/forge-ui.js','utf8'),context);
const forge=context.window.HaruForgeUI;
assert.equal(forge.tierFor(0),0);assert.equal(forge.tierFor(15),15);assert.equal(forge.tierFor(24),24);assert.equal(forge.tierFor(30),30);
assert.equal(forge.auraFor(14),'aura-steel');assert.equal(forge.auraFor(15),'aura-blue');assert.equal(forge.auraFor(20),'aura-purple');assert.equal(forge.auraFor(25),'aura-gold');assert.equal(forge.auraFor(30),'aura-mythic');
const gauge={left:0,width:100};assert.equal(forge.bellowsGrade({left:48,right:52},gauge),'perfect');assert.equal(forge.bellowsGrade({left:30,right:34},gauge),'good');assert.equal(forge.bellowsGrade({left:4,right:8},gauge),'normal');
assert.equal(forge.NAMES.length,31);assert.equal(forge.SHOP.length,11);assert.equal(new Set(forge.NAMES.map((_,level)=>forge.renderSwordSvg(level))).size,31);assert.match(forge.renderSwordSvg(30),/aether-satellites/);
assert.equal(forge.outcomeCopy.protected_destroy,'보호권 방어');assert.equal(forge.outcomeCopy.destroy,'검 파괴');
console.log('forge UI behavior: PASS (31 sword artworks, tier aura, bellows zones, shop, outcome copy)');
