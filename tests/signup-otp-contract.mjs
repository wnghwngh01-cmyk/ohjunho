import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const template=fs.readFileSync(new URL('../supabase/email-template-confirm-signup-otp.html',import.meta.url),'utf8');

assert.match(index,/id="signupOtpCode"[^>]+inputmode="numeric"[^>]+maxlength="6"/,'모바일용 6자리 인증번호 입력이 필요합니다.');
assert.match(index,/id="authEmail"[\s\S]*id="signupVerification"[\s\S]*id="authPassword"/,'가입 인증번호 영역은 이메일 바로 다음에 있어야 합니다.');
assert.match(index,/id="signupEmailAction"[^>]*>인증 이메일 보내기</,'가입 화면에 인증 이메일 전송 버튼이 필요합니다.');
assert.match(index,/id="signupOtpResend"[^>]*>인증번호 다시 보내기</,'인증번호 재전송 버튼이 필요합니다.');
assert.doesNotMatch(index,/id="signupVerifyOpen"/,'로그인 화면에 가입 인증번호 진입 버튼이 남으면 안 됩니다.');
assert.doesNotMatch(index,/id="signupOtpModal"/,'가입 인증번호를 작은 별도 팝업으로 받으면 안 됩니다.');
assert.match(index,/id="findAccount"/,'가입 이메일 찾기 안내가 필요합니다.');
assert.match(index,/가입 이메일이 아이디/,'이메일 아이디 구조를 설명해야 합니다.');
assert.match(db,/verifyOtp\(\{email,token,type:'email'\}\)/,'가입 OTP를 Supabase에서 검증해야 합니다.');
assert.match(db,/auth\.resend\(\{type:'signup',email\}\)/,'가입 OTP 재전송을 지원해야 합니다.');
assert.match(app,/code\.length!==6/,'잘못된 길이의 인증번호를 거부해야 합니다.');
assert.match(app,/textContent=sent\?'인증번호 확인':'인증 이메일 보내기'/,'전송 뒤 같은 버튼이 인증번호 확인으로 바뀌어야 합니다.');
assert.match(app,/authHelpLinks.*mode!==\'signin\'/,'아이디·비밀번호 찾기는 로그인 탭에만 보여야 합니다.');
assert.match(app,/인증번호가 틀렸거나 만료됐습니다/,'실패한 인증번호에 계정 정보를 노출하지 않는 오류를 보여야 합니다.');
assert.match(template,/\{\{ \.Token \}\}/,'확인 메일에 OTP 토큰을 포함해야 합니다.');
console.log('signup otp contract: PASS');
