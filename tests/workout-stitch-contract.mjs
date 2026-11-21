import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 운동 Stitch screens ("운동 (운동 관리)", "운동 (단백질 기록)", "운동 (상태 모음)", 2026-11-21), implemented 2026-11-21.
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const html=read('index.html'),ui=read('js/workout-ui.js'),sw=read('sw.js'),pkg=read('package.json');
const shell=read('assets/workout-stitch.css'),input=read('assets/workout-stitch-input.css'),generated=read('assets/workout-stitch.generated.css'),config=read('scripts/tailwind.workout-stitch.config.cjs');

const start=html.indexOf('<section id="workoutPage"'),end=html.indexOf('<section id="',start+10),page=html.slice(start,end);
assert.ok(start>0&&end>start,'운동 section exists');
assert.doesNotMatch(page,/page-head|<h1|eyebrow|notification/i,'no page title or bell');
assert.doesNotMatch(page,/\sstyle="|\son[a-z]+="/,'CSP: no inline style or handlers');
for(const id of ['workoutSections','workoutSectionName','workoutSectionAdd','proteinPrev','proteinNext','proteinDate','proteinDateText','proteinDateLabel','proteinTotal','proteinLabel','proteinGrams','proteinAdd','proteinList'])assert.match(page,new RegExp(`id="${id}"`),id);
assert.match(page,/data-workout-tab="exercise" aria-pressed="true"/);assert.match(page,/data-workout-pane="protein" class="hidden/);
assert.match(page,/id="proteinDate" aria-label="단백질 기록 날짜" class="absolute inset-0 w-full h-full opacity-0/,'tapping the date opens the native picker');
// 360px: every "input + button" row lets the input shrink and keeps the button whole (found by on-device test).
for(const id of ['workoutSectionName','proteinLabel'])assert.match(page,new RegExp(`id="${id}"[^>]*class="[^"]*flex-1[^"]*min-w-0`),id);
for(const id of ['workoutSectionAdd','proteinAdd'])assert.match(page,new RegExp(`id="${id}" class="[^"]*shrink-0`),id);
assert.match(page,/class="relative w-24 shrink-0"><input type="number" id="proteinGrams"/);
// Keyboard done/enter submits: Android IMEs send no Enter keydown, so the add rows are real forms (found on device).
assert.match(page,/<form id="workoutSectionForm" novalidate/);assert.match(page,/<form id="proteinForm" novalidate/);assert.match(page,/type="submit" id="workoutSectionAdd"/);assert.match(page,/type="submit" id="proteinAdd"/);assert.match(ui,/<form data-exercise-form=/);assert.match(ui,/<button type="submit" data-add-exercise=/);
assert.doesNotMatch(html,/workout\.css|workout-layout\.css/,'old workout styles are gone');
assert.ok(!fs.existsSync(new URL('../assets/workout.css',import.meta.url)));

for(const file of ['assets/workout-stitch.css','assets/workout-stitch.generated.css','js/workout-ui.js']){
  const url=html.match(new RegExp(`(?:href|src)="(\\./${file.replace(/[.]/g,'\\.')}\\?v=[^"]+)"`))?.[1];
  assert.ok(url,`${file} is linked`);assert.ok(sw.includes(`'${url}'`),`${file} is in the SW shell`);
}
assert.match(pkg,/"build:workout-css": "tailwindcss -c scripts\/tailwind\.workout-stitch\.config\.cjs -i assets\/workout-stitch-input\.css -o assets\/workout-stitch\.generated\.css --minify"/);
assert.match(pkg,/"build:stitch-css": "[^"]*pnpm run build:workout-css/);
assert.match(config,/important:'#workoutPage'/);assert.match(config,/'\.\/js\/workout-ui\.js'/);
assert.match(input,/:where\(#workoutPage\) \*/);assert.doesNotMatch(input,/(^|[^(])#workoutPage[ ,{]/m);
for(const cls of ['shadow-subtle','group-open\\/part\\:rotate-180','group-open\\/ex\\:rotate-180','group-open\\/hist\\:rotate-180','border-dashed','grid-cols-\\[40px_1fr_1fr_40px\\]'])assert.ok(generated.includes(cls),`generated CSS has ${cls}`);
assert.match(shell,/#workoutPage\{width:100%;max-width:480px/);assert.match(shell,/-webkit-inner-spin-button/);

// Behaviour hooks.
for(const token of ["requestAnimationFrame(()=>{try{el.select()}catch{}})","page.addEventListener('focusin',focusin)","page.addEventListener('toggle',toggle,true)","page.addEventListener('submit',submit)","form.id==='workoutSectionForm'","form.dataset.exerciseForm","grams.focus();return","confirm('이 단백질 기록을 삭제할까요?')","confirm('이 부위와 안의 운동 기록을 모두 삭제할까요?')","confirm('이 운동과 이전 기록을 삭제할까요?')",'rememberOpen()','openExercises.add(id)','busy.has(key)','moveDay(-1)','moveDay(1)'])assert.ok(ui.includes(token),token);

// Render the templates with sample data in a tiny DOM stand-in.
const els={},make=id=>els[id]??={id,value:'',textContent:'',innerHTML:'',classList:{toggle(){}},addEventListener(){},set onclick(f){},set onchange(f){}};
const document={querySelector:s=>s.startsWith('#')?make(s.slice(1)):null,querySelectorAll:()=>[]};
const ctx={window:{},document,requestAnimationFrame:f=>f(),Intl,Date,Number,String,Math,Promise,Set,Map,console};vm.runInNewContext(ui,ctx);
const api=ctx.window.HaruWorkoutUI;let sectionsData=[],proteinRows=[];
const db={today:()=>'2026-11-21',listWorkout:async()=>sectionsData,listProtein:async()=>proteinRows};
api.init({db,notify(){}});
// Empty states.
await api.load();
assert.match(els.workoutSections.innerHTML,/아직 만든 부위가 없습니다\./);assert.match(els.proteinList.innerHTML,/이 날짜에는 아직 기록이 없습니다\./);
assert.equal(els.proteinDateText.textContent,'11월 21일 (토)');assert.equal(els.proteinDateLabel.textContent,'오늘 섭취량');assert.equal(els.proteinTotal.textContent,'0');
// Filled.
sectionsData=[{id:'s1',name:'가슴',exercises:[{id:'e1',name:'벤치프레스',memo:'다음 <b>',sets:[{weight:60,reps:10},{weight:60,reps:8},{weight:55,reps:10}]},{id:'e2',name:'푸시업',memo:'',sets:[{weight:0,reps:20},{weight:0,reps:15}]},{id:'e3',name:'새 운동',memo:'',sets:[]}]},{id:'s2',name:'어깨',exercises:[]}];
proteinRows=[{id:'p1',label:'',grams:30},{id:'p2',label:'계란 2개',grams:12.5}];
await api.load();
const w=els.workoutSections.innerHTML,p=els.proteinList.innerHTML;
assert.match(w,/3세트 · 60kg × 10회/);assert.match(w,/2세트 · 20회/,'bodyweight shows reps only');assert.match(w,/>1세트</,'no sets yet');
assert.match(w,/운동 3개/);assert.match(w,/운동 0개/);assert.match(w,/아직 운동이 없습니다\. 아래에서 추가해 보세요\./);
assert.match(w,/다음 &lt;b&gt;/,'memo escaped');assert.doesNotMatch(w,/\sstyle="/);
// Order inside an opened exercise: sets → add set → memo → name → save → history → delete.
const body=w.slice(w.indexOf('data-exercise="e1"'));const order=['data-set-list','data-add-set','data-exercise-memo','data-exercise-name','data-save-exercise','data-show-history','data-delete-exercise'].map(k=>body.indexOf(k));
assert.deepEqual([...order].sort((a,b)=>a-b),order,'sets come first');
assert.match(w,/value="" placeholder="0" data-set-weight/,'zero shows as placeholder, not a value to delete');
assert.match(p,/섭취 내역 \(2건\)/);assert.match(p,/>단백질<\/span>/,'unnamed entry shows 단백질');assert.match(p,/12\.5 g/);
assert.equal(els.proteinTotal.textContent,'42.5');

console.log('workout stitch contract: PASS');
