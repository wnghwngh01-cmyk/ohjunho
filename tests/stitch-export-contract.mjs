import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const templates=read('js/stitch-export-templates.js');
const exactCss=read('assets/stitch-export-exact.css');
const worker=read('sw.js');

assert.match(html,/stitch-tailwind\.generated\.css\?v=20261107-stitch-export-v1/);
assert.match(html,/stitch-export-exact\.css\?v=20261107-stitch-export-v1/);
assert.match(html,/stitch-export-templates\.js\?v=20261107-stitch-export-v1/);
assert.doesNotMatch(html,/stitch-redesign\.css/);
assert.match(templates,/Generated from C:\/Users\/wnghw\/Downloads\/stitch_ui_ux\.zip/);
for(const page of ['today','today-settings','records','calendar','personal','lab','diary','books','notifications','support','more','shelter','forge','workout','square','settings','auth']){
  assert.match(templates,new RegExp(`"${page}":`),`Stitch export template missing: ${page}`);
}
assert.doesNotMatch(templates,/https:\/\/lh3\.googleusercontent\.com/);
assert.doesNotMatch(templates,/\son[a-z]+=/i);
assert.match(exactCss,/\.stitch-legacy-support\{display:none!important\}/);
assert.match(worker,/daily-life-shell-v114/);
assert.match(worker,/stitch-export-templates\.js\?v=20261107-stitch-export-v1/);
for(let index=1;index<=12;index++)assert.ok(fs.existsSync(`assets/stitch-media/stitch-${String(index).padStart(2,'0')}.jpg`));
assert.ok(fs.existsSync('assets/stitch-media/idea-cover.jpg'));

console.log('stitch export contract: ok');
