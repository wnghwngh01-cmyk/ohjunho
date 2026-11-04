import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const data=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../js/forge-ui.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/forge.css',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../supabase/migrations/20261104120000_step29_shelter_forge.sql',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

for(const id of ['page-forge','forgeEnhance','forgeBellows','forgeBellowsStop','forgeUseShield','forgeUseWhetstone','forgeSkipBellows','forgeShareEvents','forgeHistory','forgeGraveyard','forgeStats'])assert.match(html,new RegExp(`id="${id}"`),id);
assert.match(html,/data-go="forge"[\s\S]*?검 강화하기/);assert.match(html,/data-square-category="forge"/);assert.match(html,/maxlength="12"/);
assert.match(app,/forge:\['검 강화하기'/);assert.match(app,/page==='forge'\)await Forge\.open/);assert.match(app,/state\.squareCategory==='forge'/);assert.match(app,/forge-publication/);assert.match(app,/조의를 표합니다/);
for(const rpc of ['get_forge_state','attempt_forge','update_forge_preferences','exchange_forge_item'])assert.match(data,new RegExp(`rpc\\('${rpc}'`),rpc);
for(const behavior of ['goldenHit','navigator.vibrate','AudioContext','p_bellows_bonus'])assert.match(behavior==='p_bellows_bonus'?data:ui,new RegExp(behavior.replace('.','\\.')),behavior);
for(const className of ['aura-blue','aura-purple','aura-gold','aura-mythic','forge-gauge-needle'])assert.match(css,new RegExp(`\\.${className}`),className);
assert.match(sql,/successes int\[\]:=array\[100,100,100,90/);assert.match(sql,/p_use_shield and sword\.shields<1/);assert.match(sql,/reward_shards:=sword\.sword_level\*2/);assert.match(sql,/when 'whetstone' then 10 when 'shield' then 50/);assert.match(sql,/p_category='all' and p\.source_type<>'forge'/);
assert.match(sw,/daily-life-shell-v106/);for(const asset of ['assets/forge.css?v=20261104-forge-v1','js/forge-ui.js?v=20261104-forge-v1','js/db.js?v=20261104-forge-v1','js/app.js?v=20261104-forge-v1'])assert.ok(sw.includes(asset),asset);

console.log('forge contract: PASS (page, RPC boundary, forge interactions, dedicated Square category, cache)');
