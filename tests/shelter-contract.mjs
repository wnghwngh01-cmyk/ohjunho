import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const html=read('index.html'),ui=read('js/shelter-ui.js'),css=read('assets/shelter.css'),db=read('js/db.js'),app=read('js/app.js'),sql=read('supabase/step26_shelter_1to25.sql'),sw=read('sw.js');
for(const id of ['page-shelter','shelterLobby','shelterBest','shelterRank','shelterLeaderboard','shelterStart','shelterGame','shelterNext','shelterTimer','shelterGrid','shelterResult','shelterResultTime','settings-cosmetics','titleOptions','cosmeticsSave','sideTitleBadge'])assert.match(html,new RegExp(`id="${id}"`),id);
assert.match(html,/data-go="shelter"/);assert.match(html,/매주 월요일 24:00 초기화/);assert.match(html,/3 → 2 → 1|shelterCountdown/);
assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);assert.match(css,/\.shelter-tile\.wrong/);assert.match(css,/@media\(max-width:370px\)/);
assert.match(ui,/\['3','2','1','START!'\]/);assert.match(ui,/number!==expected\)\{wrong\(tile\);return\}/);assert.doesNotMatch(ui,/penalty|패널티|elapsed\s*\+=/i);
assert.match(db,/record_shelter_1to25/);assert.match(db,/get_shelter_leaderboard/);assert.match(db,/active_title/);assert.match(app,/Shelter\.open\(state\.profile\)/);assert.match(app,/decorateFeedTitles/);assert.match(app,/titleBadge\(row\.active_title\)/);
assert.match(sql,/date_trunc\('week', \(p_now at time zone 'Asia\/Seoul'\) - interval '1 day'\)::date/);assert.match(sql,/best_ms>=3000 and best_ms<=600000/);assert.match(sql,/weekly_1st/);assert.match(sql,/export_my_data_before_shelter/);assert.match(sql,/restore_my_data_before_shelter/);assert.match(sql,/active_title text/);
assert.match(sw,/daily-life-shell-v103/);assert.match(sw,/shelter-ui\.js\?v=20261030-shelter-v1/);

const context={window:{}};vm.runInNewContext(ui,context);const shelter=context.window.HaruShelterUI;
assert.equal(shelter.formatMs(8420),'08.42초');assert.equal(shelter.gradeFor(9999),'master');assert.equal(shelter.gradeFor(10000),'diamond');assert.equal(shelter.gradeFor(12999),'diamond');assert.equal(shelter.gradeFor(13000),'gold');assert.equal(shelter.gradeFor(22000),'bronze');
assert.deepEqual([...shelter.shuffle([1,2,3,4],()=>0)],[2,3,4,1]);assert.equal(shelter.titleLabel('weekly_1st'),'번개의 호흡');assert.equal(shelter.safeTitle('<script>'),null);
console.log('shelter contract: PASS (screen, game rules, titles, cosmetics, cache)');
