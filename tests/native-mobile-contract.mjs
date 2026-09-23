import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [html,css,app,sw]=await Promise.all([read('index.html'),read('assets/styles.css'),read('js/app.js'),read('sw.js')]);

assert.match(html,/id="authShell" class="auth-shell hidden"/,'세션 확인 전에 로그인 화면을 노출하면 안 됩니다.');
assert.match(css,/--safe-top:env\(safe-area-inset-top/,'Android 상태바 안전 영역을 반영해야 합니다.');
assert.match(css,/html\.native-app \.side-rail\{display:none\}/,'가로 화면에서도 데스크톱 사이드바로 전환하면 안 됩니다.');
assert.match(css,/overflow-wrap:anywhere/,'긴 사용자 입력이 화면 폭을 늘리면 안 됩니다.');
assert.match(app,/history\.pushState\(\{haruPage:page\}/,'내부 페이지 이동을 Android 뒤로가기에 기록해야 합니다.');
assert.match(app,/haruOverlay:'lightbox'/,'사진 확대 화면을 뒤로가기로 닫을 수 있어야 합니다.');
assert.match(app,/touchmove[\s\S]*setLightboxScale/,'사진 확대 화면에서 두 손가락 확대를 지원해야 합니다.');
assert.match(app,/key:'offline',duration:0/,'오프라인 알림은 하나로 유지해야 합니다.');
assert.match(sw,/daily-life-shell-v32/,'수정된 모바일 자산을 받도록 캐시를 갱신해야 합니다.');

console.log('native mobile contract: PASS');
