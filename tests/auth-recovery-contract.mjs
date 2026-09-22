import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [index,app,db,resetPage,resetScript,worker]=await Promise.all([
  read('index.html'),read('js/app.js'),read('js/db.js'),read('reset-password.html'),read('js/reset-password.js'),read('sw.js')
]);

assert.match(index,/id="forgotPassword"[^>]*type="button"/,'로그인 화면에 비밀번호 재설정 진입점이 있어야 합니다.');
assert.match(app,/DB\.requestPasswordReset\(email\)/,'화면 요청이 인증 API에 연결되어야 합니다.');
assert.match(app,/emailInput\.checkValidity\(\)/,'재설정 요청 전에 이메일 형식을 검사해야 합니다.');
assert.match(app,/가입 여부와 관계없이/,'계정 존재 여부를 성공 문구로 노출하면 안 됩니다.');
assert.match(app,/function authErrorMessage\(error,mode='signin'\)/,'인증 오류를 안전한 사용자 문구로 변환해야 합니다.');
assert.match(app,/status===429\|\|\/rate limit/,'서버 요청 제한 오류를 명확히 안내해야 합니다.');
assert.match(app,/이메일 또는 비밀번호를 확인해 주세요/,'로그인 실패는 계정 존재 여부를 드러내지 않아야 합니다.');
assert.doesNotMatch(app,/authMessage'\)\.textContent=err\.message/,'인증 서버의 원문 오류를 화면에 그대로 노출하면 안 됩니다.');
assert.match(db,/resetPasswordForEmail\(email,\{redirectTo\}\)/,'Supabase 재설정 메일 API를 사용해야 합니다.');
assert.match(db,/new URL\('\.\/reset-password\.html',location\.href\)/,'현재 배포 도메인의 재설정 화면으로 돌아와야 합니다.');

assert.match(resetPage,/Content-Security-Policy/,'재설정 화면에도 CSP가 필요합니다.');
assert.match(resetPage,/id="newPassword"[^>]*minlength="8"[^>]*disabled/,'유효한 복구 세션 전에는 새 비밀번호 입력을 막아야 합니다.');
assert.match(resetPage,/id="newPasswordConfirm"[^>]*disabled/,'비밀번호 확인 입력도 복구 세션 전에는 막아야 합니다.');
assert.match(resetScript,/event==='PASSWORD_RECOVERY'/,'일반 로그인 세션과 복구 세션을 구분해야 합니다.');
assert.match(resetScript,/password\.value\.length<8/,'새 비밀번호 최소 길이를 검사해야 합니다.');
assert.match(resetScript,/password\.value!==confirmation\.value/,'비밀번호 확인 일치를 검사해야 합니다.');
assert.match(resetScript,/auth\.updateUser\(\{password:password\.value\}\)/,'검증 후 Supabase 비밀번호 변경 API를 호출해야 합니다.');
assert.match(resetScript,/auth\.signOut\(\)/,'변경 뒤 기존 복구 세션을 종료해야 합니다.');
assert.doesNotMatch(resetScript,/getSession\(\).*enableForm/s,'일반 로그인 세션만으로 변경 폼을 열면 안 됩니다.');
assert.match(worker,/reset-password\.html/,'재설정 화면을 오프라인 셸 목록에 포함해야 합니다.');
assert.match(worker,/js\/reset-password\.js/,'재설정 스크립트를 오프라인 셸 목록에 포함해야 합니다.');

console.log('auth recovery contract: PASS');
