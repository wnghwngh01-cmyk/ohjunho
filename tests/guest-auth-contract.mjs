import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

assert.match(index,/id="guestLoginOpen"/,'게스트 진입 버튼이 필요합니다.');
assert.match(index,/id="guestRiskCheck"/,'복구 제한 확인 절차가 필요합니다.');
assert.match(index,/로그아웃, 앱 삭제, 브라우저 데이터 삭제 또는 기기 변경/,'세션 상실 조건을 안내해야 합니다.');
assert.match(db,/signInAnonymously/,'Supabase 익명 로그인을 사용해야 합니다.');
assert.match(app,/게스트-.*slice\(-4\)/s,'익명 사용자별 표시 이름을 만들어야 합니다.');
assert.match(app,/if\(isGuest\(\).*confirm/s,'게스트 종료 전 데이터 접근 상실을 확인해야 합니다.');
assert.match(app,/emailInput\.checkValidity\(\)/,'잘못된 이메일 형식을 가입 요청 전에 거부해야 합니다.');
assert.match(sw,/daily-life-shell-v36/,'게스트 로그인 자산을 새 캐시로 배포해야 합니다.');
console.log('guest auth contract: PASS');
