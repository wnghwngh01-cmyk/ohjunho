import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const html=read('index.html'),publicHtml=read('public.html'),ui=read('js/shelter-ui.js'),css=read('assets/shelter.css'),db=read('js/db.js'),app=read('js/app.js'),sql26=read('supabase/step26_shelter_1to25.sql'),sql27=read('supabase/step27_shelter_weekly_settlement.sql'),sw=read('sw.js');
for(const id of ['page-shelter','shelterLobby','shelterBest','shelterRank','shelterLeaderboard','shelterStart','shelterGame','shelterNext','shelterTimer','shelterGrid','shelterResult','shelterResultTime','settings-cosmetics','titleOptions','cosmeticsSave','sideTitleBadge'])assert.match(html,new RegExp(`id="${id}"`),id);
assert.doesNotMatch(html,/id="shelterActiveTitle"/);
assert.match(html,/<h2 class="more-group-label">하루 쉼터<\/h2><button data-go="shelter"><b>◈<\/b><span>1 to 25<\/span>/);
assert.match(html,/<p class="eyebrow">하루 쉼터 · HARU SHELTER<\/p><h1>1 to 25<\/h1>/);
assert.match(html,/월요일 24:00 정산 보상 미리보기/);assert.match(html,/shelterCountdown/);
assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);assert.match(css,/\.shelter-tile\.wrong/);assert.match(css,/\.shelter-rank-rewards/);assert.match(css,/@media\(max-width:370px\)/);
assert.match(ui,/\['3','2','1','START!'\]/);assert.match(ui,/number!==expected\)\{wrong\(tile\);return\}/);assert.doesNotMatch(ui,/penalty|패널티|elapsed\s*\+=/i);
assert.match(ui,/rankTitleFor/);assert.match(ui,/정산 보상/);assert.match(ui,/매주 월요일 24:00 정산 시 지급됩니다/);assert.doesNotMatch(ui,/새 칭호 획득/);
assert.match(db,/record_shelter_1to25/);assert.match(db,/get_shelter_leaderboard/);assert.match(db,/active_title/);assert.match(app,/Shelter\.open\(state\.profile\)/);
assert.match(app,/shelter:\['1 to 25','하루 쉼터 · 타임어택 미니게임'\]/);assert.doesNotMatch(app,/decorateFeedTitles/);
assert.match(app,/class="pub-author-name-line"[\s\S]*?\$\{esc\(p\.display_name\)\}[\s\S]*?\$\{Shelter\.titleBadge\(p\.active_title\)\}/);assert.match(app,/\$\{esc\(c\.display_name\)\} \$\{Shelter\.titleBadge\(c\.active_title\)\}/);
assert.match(sql26,/date_trunc\('week', \(p_now at time zone 'Asia\/Seoul'\) - interval '1 day'\)::date/);assert.match(sql26,/best_ms>=3000 and best_ms<=600000/);
assert.match(sql27,/create table if not exists public\.shelter_weekly_settlements/);assert.match(sql27,/settle_shelter_weekly_titles/);assert.match(sql27,/perform public\.settle_shelter_weekly_titles/);
assert.match(sql27,/active_title is null or unlocked_titles \? active_title/);assert.match(sql27,/new_titles','\[\]'::jsonb/);assert.match(sql27,/expected_grade/);
assert.match(sql27,/where p\.id=any\(coalesce\(p_ids,array\[\]::uuid\[\]\)\)/);assert.doesNotMatch(sql27,/p\.public_profile=true or p\.id=auth\.uid/);
assert.match(sql27,/cron\.schedule\('settle-shelter-weekly-titles','0 15 \* \* 1'/);
assert.match(sw,/daily-life-shell-v105/);assert.match(sw,/shelter-ui\.js\?v=20261030-shelter-v2/);assert.match(html,/shelter-ui\.js\?v=20261030-shelter-v2/);assert.match(publicHtml,/shelter-ui\.js\?v=20261030-shelter-v2/);

const context={window:{}};vm.runInNewContext(ui,context);const shelter=context.window.HaruShelterUI;
assert.equal(shelter.formatMs(8420),'08.42초');assert.equal(shelter.gradeFor(9999),'master');assert.equal(shelter.gradeFor(10000),'diamond');assert.equal(shelter.gradeFor(12999),'diamond');assert.equal(shelter.gradeFor(13000),'gold');assert.equal(shelter.gradeFor(22000),'bronze');
assert.equal(shelter.rankTitleFor(1),'weekly_1st');assert.equal(shelter.rankTitleFor(3),'weekly_3rd');assert.equal(shelter.rankTitleFor(10),'weekly_top10');assert.equal(shelter.rankTitleFor(11),null);
assert.deepEqual([...shelter.shuffle([1,2,3,4],()=>0)],[2,3,4,1]);assert.equal(shelter.titleLabel('weekly_1st'),'번개의 호흡');assert.equal(shelter.safeTitle('<script>'),null);
console.log('shelter contract: PASS (weekly settlement, menu hierarchy, reward preview, direct title markup)');
