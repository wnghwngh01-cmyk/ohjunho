import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const data=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../js/forge-ui.js',import.meta.url),'utf8');
const shelter=fs.readFileSync(new URL('../js/shelter-ui.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/forge.css',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../supabase/migrations/20261104190000_step30_forge_game_remake.sql',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

for(const id of ['page-forge','forgeSoundToggle','forgeGraveOpen','forgeGuideOpen','forgeDailySupply','forgeStaminaDots','forgePoints','forgeSwordVisual','forgeSuccessRate','forgeStayRate','forgeDestroyRate','forgeUseShield','forgeUseWhetstone','forgeEnhance','forgeSkipBellows','forgeHallOpen','forgeSell','forgeShowcase','forgeLeaderboard','forgeShop','forgeGraveyard','forgeHistory','forgeStats','forgeGuide','forgeHallModal','forgeGraveModal','forgeBellows','forgeBellowsStop'])assert.match(html,new RegExp(`id="${id}"`),id);
assert.match(html,/data-go="forge"[\s\S]*?검 강화하기/);assert.match(html,/data-square-category="forge"/);assert.match(html,/명예의 전당 랭킹/);assert.match(html,/maxlength="12"/);
assert.match(app,/forge:\['검 강화하기'/);assert.match(app,/page==='forge'\)await Forge\.open/);assert.match(app,/state\.squareCategory==='forge'/);assert.match(app,/Forge\.publicationCard/);assert.match(app,/헌화하기/);
for(const rpc of ['get_forge_state','attempt_forge','update_forge_preferences','claim_forge_tutorial','claim_forge_daily_supply','buy_forge_item','sell_forge_sword','register_forge_hall','publish_forge_showcase','publish_forge_obituary'])assert.match(data,new RegExp(`rpc\\('${rpc}'`),rpc);
for(const behavior of ['renderSwordSvg','bellowsGrade','navigator.vibrate','AudioContext','p_bellows_grade','aether-satellites'])assert.match(behavior==='p_bellows_grade'?data:ui,new RegExp(behavior.replace('.','\\.')),behavior);
for(const className of ['forge-status-bar','forge-sword-stage','forge-item-slots','forge-tabs','forge-rank-row','forge-shop-grid','forge-certificate','aura-blue','aura-purple','aura-gold','aura-mythic','forge-gauge-needle'])assert.match(css,new RegExp(`\\.${className}`),className);
for(const title of ['forge_apprentice','forge_bronze','forge_silver','forge_gold','forge_diamond','forge_master','forge_mythic','forge_destroyer'])assert.match(shelter,new RegExp(title),title);
assert.match(sql,/successes numeric\[\]:=array\[100,95,90,85/);assert.match(sql,/result_kind:='protected_destroy'/);assert.match(sql,/check\(outcome in\('success','stay','destroy','protected_destroy'\)\)/);assert.doesNotMatch(sql,/next_level:=sword\.sword_level-1/);assert.match(sql,/stamina=stamina-1/);assert.match(sql,/claim_forge_daily_supply/);assert.match(sql,/create table if not exists public\.shelter_forge_best/);assert.match(sql,/when'shard_shield'then fragment_cost:=30/);
assert.match(sw,/daily-life-shell-v10\d/);

console.log('forge contract: PASS (game UI, atomic RPCs, 31 swords, Hall of Fame, shop, titles, dedicated Square cards)');
