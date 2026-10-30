import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('js/app.js','utf8');
const db=fs.readFileSync('js/db.js','utf8');
const styles=fs.readFileSync('assets/styles.css','utf8');
const light=fs.readFileSync('assets/light-theme.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const migration=fs.readFileSync('supabase/step28_profile_name_limits.sql','utf8');
const deployMigration=fs.readFileSync('supabase/migrations/20261030160000_step28_profile_name_limits.sql','utf8');

for(const id of ['authName','onboardingName','settingsName'])assert.match(html,new RegExp(`id="${id}"[^>]*maxlength="8"`));
for(const id of ['onboardingLabName','settingsLabName'])assert.match(html,new RegExp(`id="${id}"[^>]*maxlength="12"`));
assert.match(db,/limitedName\(displayName,8,'이름'\)/);
assert.match(db,/limitedName\(labName,12,'공간 이름'\)/);
assert.match(db,/display_name:name,lab_name:name/);
assert.doesNotMatch(db,/lab_name:`\$\{name\}의 하루`/);
assert.match(app,/class="pub-author-name-line"[\s\S]*?esc\(p\.display_name\)[\s\S]*?Shelter\.titleBadge\(p\.active_title\)/);
assert.match(app,/class="pub-lab-name">\$\{esc\(p\.lab_name\)\}/);
assert.match(app,/collapsibleCopy\(p\.body,'',fmtTime\(p\.published_at\)\)/);
assert.match(app,/class="publication-time"[\s\S]*?data-toggle-copy/);
assert.doesNotMatch(app,/esc\(p\.lab_name\)[\s\S]{0,160}fmtTime\(p\.published_at\)/);
assert.match(styles,/\.pub-author-name-line \.title-badge\{[^}]*flex:0 0 78px[^}]*width:78px/);
assert.match(styles,/\.pub-author-name-line strong\{[^}]*text-overflow:ellipsis[^}]*white-space:nowrap/);
assert.match(styles,/\.publication-time\{[^}]*display:block/);
assert.match(light,/\.pub-author-name-line strong\{[^}]*-webkit-line-clamp:unset/);
assert.match(migration,/char_length\(new\.display_name\)>8/);
assert.match(migration,/char_length\(new\.lab_name\)>12/);
assert.match(migration,/is distinct from old\.display_name/);
for(const token of ['enforce_profile_name_limits','profiles_name_limits','char_length(new.display_name)>8','char_length(new.lab_name)>12','step28_profile_name_probe'])assert.match(deployMigration,new RegExp(token.replace(/[().]/g,'\\$&')));
assert.match(sw,/daily-life-shell-v105/);
for(const asset of ['assets/styles.css','assets/light-theme.css','js/db.js','js/app.js'])assert.match(sw,new RegExp(asset.replace(/[./]/g,'\\$&')+'\\?v=20261030-square-author-v1'));

console.log('square author layout contract: PASS');
