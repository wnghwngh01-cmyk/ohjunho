import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{},document:{querySelector(){return null},querySelectorAll(){return[]}},navigator:{}};
vm.runInNewContext(fs.readFileSync('js/forge-ui.js','utf8'),context);
const forge=context.window.HaruForgeUI;
assert.equal(forge.tierFor(0),0);assert.equal(forge.tierFor(15),15);assert.equal(forge.tierFor(24),20);assert.equal(forge.tierFor(30),30);
assert.equal(forge.auraFor(14),'aura-none');assert.equal(forge.auraFor(15),'aura-blue');assert.equal(forge.auraFor(20),'aura-purple');assert.equal(forge.auraFor(25),'aura-gold');assert.equal(forge.auraFor(30),'aura-mythic');
const zone={left:43,right:57};assert.equal(forge.goldenHit({left:48,width:4},zone),true);assert.equal(forge.goldenHit({left:60,width:4},zone),false);
assert.equal(forge.outcomeCopy.protected_destroy,'보호권 방어');assert.equal(forge.outcomeCopy.destroy,'검 파괴');
console.log('forge UI behavior: PASS (tier aura, bellows golden-zone hit, outcome copy)');
