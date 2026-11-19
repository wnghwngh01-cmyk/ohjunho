import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('js/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const todayCss=fs.readFileSync('assets/today-stitch.css','utf8');
const calendarCss=fs.readFileSync('assets/calendar-stitch.css','utf8');
const versionJs=fs.readFileSync('js/app-version.js','utf8');
const gradle=fs.readFileSync('android/app/build.gradle','utf8');
const sw=fs.readFileSync('sw.js','utf8');

// #3 Today todos can be deleted (functional control; final visual comes with the Stitch pass).
const renderTodos=app.match(/function renderTodos\(\)\{[^\n]*/)?.[0]||'';
assert.match(renderTodos,/data-todo-delete="\$\{esc\(x\.id\)\}"/,'each todo row renders a delete control');
assert.match(app,/closest\('\[data-todo-delete\]'\);if\(todoDelete\)\{if\(!confirm\('이 할 일을 삭제할까요\?'\)\)return;/,'todo deletion asks first');

// #5 "요일 선택" with no weekday must not silently save Monday.
assert.doesNotMatch(app,/days\.length\?days:\[1\]/);
assert.match(app,/return days\.length\?\{type,days,start_date\}:null/);
assert.match(app,/const schedule=habitScheduleValue\(\);if\(!schedule\)return toast\('요일을 하나 이상 선택해 주세요\.'\);/);

// #6 Calendar event deletion asks first.
assert.match(app,/closest\('\[data-delete-event\]'\);if\(delEvent\)\{if\(!confirm\('이 일정을 삭제할까요\?'\)\)return;/);

// V1 Today bell is centered like the approved Stitch file (flex items-center justify-center).
const bell=todayCss.match(/\.topbar-notification-btn\{[^}]*\}/)?.[0]||'';
assert.match(bell,/display:flex;align-items:center;justify-content:center;/);

// V3 checkboxes keep their Stitch size but get a 44px touch target.
assert.match(todayCss,/#page-today \.stitch-check\{position:relative;width:20px;/);
assert.match(todayCss,/#page-today \.stitch-check:before\{content:'';position:absolute;inset:-12px\}/);
assert.match(calendarCss,/#page-calendar \.check \{ width: 16px !important; height: 16px !important;/);
assert.match(calendarCss,/#page-calendar \.check::before \{ content: '' !important; position: absolute !important; inset: -14px !important; \}/);

// V2 one version source shown in More and used by Gradle.
const sandbox={window:{},document:{readyState:'complete',querySelectorAll:()=>[]}};
vm.runInNewContext(versionJs,sandbox);
assert.equal(sandbox.window.HARU_APP_VERSION.name,'1.1.0','show 1.1.0 until release');
assert.ok(Number.isInteger(sandbox.window.HARU_APP_VERSION.code)&&sandbox.window.HARU_APP_VERSION.code>=3,'versionCode must keep increasing');
assert.match(html,/하루를 담다 · v<span id="appVersionLabel"><\/span>/);
assert.doesNotMatch(html,/v\d+\.\d+\.\d+/,'no hard-coded version numbers in index.html');
assert.match(html,/<script src="\.\/js\/app-version\.js\?v=[^"]+"><\/script>/);
assert.match(sw,/'\.\/js\/app-version\.js\?v=[^']+'/);
assert.match(gradle,/file\('\.\.\/\.\.\/js\/app-version\.js'\)/);
assert.match(gradle,/versionCode appVersionCode/);
assert.match(gradle,/versionName appVersionName/);
assert.doesNotMatch(gradle,/versionName "/,'versionName must not be hard-coded in Gradle');

console.log('today/calendar/more fixes contract: PASS (todo delete, weekday validation, event confirm, bell centering, touch targets, single version)');
