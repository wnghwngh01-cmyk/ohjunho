import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

assert.match(index,/id="guestLoginOpen"/,'게스트 진입 버튼이 필요합니다.');
assert.match(index,/id="guestLoginArea"/,'로그인 탭 전용 게스트 영역이 필요합니다.');
assert.doesNotMatch(index,/id="guestLoginModal"|id="guestRiskCheck"/,'게스트 진입을 추가 팝업이나 체크박스로 막으면 안 됩니다.');
assert.match(db,/signInAnonymously/,'Supabase 익명 로그인을 사용해야 합니다.');
assert.match(db,/persistSession:true/,'게스트 세션은 같은 기기에 유지되어야 합니다.');
assert.match(app,/게스트-.*slice\(-4\)/s,'익명 사용자별 표시 이름을 만들어야 합니다.');
assert.match(app,/guestLoginArea.*mode!==\'signin\'/,'회원가입 탭에서는 게스트 버튼을 숨겨야 합니다.');
assert.match(app,/guestLoginOpen'\)\.addEventListener\('click',startGuest\)/,'게스트 버튼은 한 번 눌러 바로 익명 로그인을 시작해야 합니다.');
assert.match(app,/mode==='guest'.*게스트 체험을 시작하지 못했습니다/s,'게스트 실패를 일반 로그인 오류로 표시하면 안 됩니다.');
assert.match(app,/if\(isGuest\(\).*confirm/s,'게스트 종료 전 데이터 접근 상실을 확인해야 합니다.');
assert.match(app,/emailInput\.checkValidity\(\)/,'잘못된 이메일 형식을 가입 요청 전에 거부해야 합니다.');
assert.match(sw,/daily-life-shell-v38/,'수정된 인증 자산을 새 캐시로 배포해야 합니다.');
console.log('guest auth contract: PASS');
