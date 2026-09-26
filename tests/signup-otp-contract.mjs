import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const template=fs.readFileSync(new URL('../supabase/email-template-confirm-signup-otp.html',import.meta.url),'utf8');

assert.match(index,/id="signupOtpCode"[^>]+inputmode="numeric"[^>]+maxlength="6"/,'모바일용 6자리 인증번호 입력이 필요합니다.');
assert.match(index,/id="findAccount"/,'가입 이메일 찾기 안내가 필요합니다.');
assert.match(index,/가입 이메일이 아이디/,'이메일 아이디 구조를 설명해야 합니다.');
assert.match(db,/verifyOtp\(\{email,token,type:'email'\}\)/,'가입 OTP를 Supabase에서 검증해야 합니다.');
assert.match(db,/auth\.resend\(\{type:'signup',email\}\)/,'가입 OTP 재전송을 지원해야 합니다.');
assert.match(app,/code\.length!==6/,'잘못된 길이의 인증번호를 거부해야 합니다.');
assert.match(app,/인증번호가 틀렸거나 만료됐습니다/,'실패한 인증번호에 계정 정보를 노출하지 않는 오류를 보여야 합니다.');
assert.match(template,/\{\{ \.Token \}\}/,'확인 메일에 OTP 토큰을 포함해야 합니다.');
console.log('signup otp contract: PASS');
