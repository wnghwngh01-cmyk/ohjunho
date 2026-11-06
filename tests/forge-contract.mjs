import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const data=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../js/forge-ui.js',import.meta.url),'utf8');
const shelter=fs.readFileSync(new URL('../js/shelter-ui.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/forge.css',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../supabase/migrations/20261104220000_step31_forge_play_feedback.sql',import.meta.url),'utf8');
const balanceSql=fs.readFileSync(new URL('../supabase/migrations/20261104230000_step33_forge_balance_recalibration.sql',import.meta.url),'utf8');
const shopSql=fs.readFileSync(new URL('../supabase/migrations/20261104233000_step34_forge_shop_price_reduction.sql',import.meta.url),'utf8');
const stateFixSql=fs.readFileSync(new URL('../supabase/migrations/20261104234500_step35_forge_empty_anvil_state_fix.sql',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

for(const id of ['page-forge','forgeSoundToggle','forgeGuideOpen','forgeDailySupply','forgeStaminaDots','forgePoints','forgeSwordVisual','forgeSuccessRate','forgeStayRate','forgeDestroyRate','forgeUseShield','forgeUseWhetstone','forgeEnhance','forgeSkipBellows','forgeHallOpen','forgeSell','forgeShowcase','forgeLeaderboard','forgeShop','forgeGraveyard','forgeHistory','forgeStats','forgeGuide','forgeHallModal','forgeBellows','forgeBellowsStop'])assert.match(html,new RegExp(`id="${id}"`),id);
assert.doesNotMatch(html,/id="forgeGraveOpen"|id="forgeGraveModal"|forge-entry-banner|data-go="shelter">쉼터로/);assert.match(html,/data-go="forge"[\s\S]*?검 강화하기/);assert.match(html,/data-square-category="forge"/);assert.match(html,/data-forge-tab="stats"/);assert.match(html,/data-forge-pane="stats"/);assert.match(html,/maxlength="12"/);
assert.match(app,/forge:\['검 강화하기'/);assert.match(app,/page==='forge'\)await Forge\.open/);assert.match(app,/state\.squareCategory==='forge'/);assert.match(app,/Forge\.publicationCard/);assert.match(app,/헌화하기/);
for(const rpc of ['get_forge_state','draw_forge_sword','attempt_forge','update_forge_preferences','claim_forge_tutorial','claim_forge_daily_supply','buy_forge_item','sell_forge_sword','register_forge_hall','publish_forge_showcase','publish_forge_obituary'])assert.match(data,new RegExp(`rpc\\('${rpc}'`),rpc);
for(const behavior of ['renderSwordSvg','bellowsGrade','navigator.vibrate','AudioContext','p_bellows_grade','aether-satellites'])assert.match(behavior==='p_bellows_grade'?data:ui,new RegExp(behavior.replace('.','\\.')),behavior);
for(const className of ['forge-status-bar','forge-sword-stage','forge-item-slots','forge-tabs','forge-rank-row','forge-shop-grid','forge-certificate','aura-blue','aura-purple','aura-gold','aura-mythic','forge-gauge-needle'])assert.match(css,new RegExp(`\\.${className}`),className);
for(const title of ['forge_apprentice','forge_bronze','forge_silver','forge_gold','forge_diamond','forge_master','forge_mythic','forge_destroyer'])assert.match(shelter,new RegExp(title),title);
assert.match(sql,/add column if not exists has_sword boolean not null default true/);assert.match(sql,/successes numeric\[\]:=array\[100,95,90,82/);assert.match(sql,/destroys numeric\[\]:=array\[0,0,0,3/);assert.match(sql,/check\(sword_level between 20 and 30\)/);assert.match(sql,/create or replace function public\.draw_forge_sword/);assert.match(sql,/result_kind:='protected_destroy'/);assert.doesNotMatch(sql,/next_level:=sword\.sword_level-1/);const attemptBody=sql.match(/create or replace function public\.attempt_forge[\s\S]*?create or replace function public\.buy_forge_item/)[0];assert.doesNotMatch(attemptBody,/stamina=stamina-1|sword\.stamina<1/);assert.match(sql,/stamina_updated_at=case when add_stamina>0 and least\(5,stamina\+add_stamina\)=5 then now\(\)else stamina_updated_at end/);assert.match(sql,/earned:=v\.appraisal;/);assert.match(sql,/limit 20/);assert.match(sql,/when'shard_shield'then fragment_cost:=30/);
assert.match(balanceSql,/successes numeric\[\]:=array\[100,95,90,85/);assert.match(balanceSql,/stays numeric\[\]:=array\[0,5,10,14/);assert.match(balanceSql,/destroys numeric\[\]:=array\[0,0,0,1/);assert.match(balanceSql,/when'stamina_1'then cost:=250/);
for(const contract of ["when'stamina_1'then cost:=120","when'whetstone_1'then cost:=100","when'shield_1'then cost:=200","when'shield_5'then cost:=900","when'shield_10'then cost:=1700","when'sword_10'then cost:=300","when'sword_15'then cost:=1000","when'sword_20'then cost:=3000","when'shard_shield'then fragment_cost:=25"])assert.match(shopSql,new RegExp(contract));
assert.match(stateFixSql,/rates_json jsonb:=null/);assert.match(stateFixSql,/'rates',rates_json/);assert.doesNotMatch(stateFixSql,/rates record/);
assert.match(sw,/daily-life-shell-v111/);

console.log('forge contract: PASS (empty anvil, draw-only stamina, compact game/shop, 5 tabs, 20+ graveyard, atomic RPCs)');
