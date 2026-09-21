import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [index,app,db,telemetry,sql,worker,privacy]=await Promise.all([
  read('index.html'),read('js/app.js'),read('js/db.js'),read('js/telemetry.js'),read('supabase/step8_client_error_logs.sql'),read('sw.js'),read('privacy.html')
]);

assert.match(index,/js\/telemetry\.js\?v=20260920-error-logs-v1/,'오류 기록 스크립트를 앱보다 먼저 불러와야 합니다.');
assert.ok(index.indexOf('js/telemetry.js')<index.indexOf('js/app.js'),'오류 기록기가 앱 코드보다 먼저 실행돼야 합니다.');
assert.match(app,/LabTelemetry\?\.report\(context,e\)/,'공통 오류 처리 경로가 기록기에 연결되어야 합니다.');
assert.match(telemetry,/if\(!user\|\|!db\?\.client\)return false/,'로그인하지 않은 사용자의 오류는 전송하지 않아야 합니다.');
assert.match(telemetry,/\[email\]/,'이메일을 기록 전에 가려야 합니다.');
assert.match(telemetry,/\[token\]/,'토큰 모양 문자열을 기록 전에 가려야 합니다.');
assert.match(telemetry,/COOLDOWN=5\*60\*1000/,'같은 오류의 클라이언트 반복 전송을 제한해야 합니다.');
assert.match(telemetry,/rpc\('log_client_error'/,'오류는 제한된 RPC로만 기록해야 합니다.');
assert.match(sql,/enable row level security/,'오류 로그 테이블에 RLS를 켜야 합니다.');
assert.match(sql,/revoke all on public\.client_error_logs from anon, authenticated/,'클라이언트의 직접 테이블 접근을 막아야 합니다.');
assert.match(sql,/auth\.uid\(\)/,'서버가 현재 로그인 사용자를 정해야 합니다.');
assert.match(sql,/interval '5 minutes'/,'서버도 같은 오류의 반복 저장을 제한해야 합니다.');
assert.match(sql,/>= 60/,'사용자별 시간당 전체 오류 수를 제한해야 합니다.');
assert.match(sql,/export_my_error_logs\(\)/,'사용자가 자기 오류 기록도 내보낼 수 있어야 합니다.');
assert.match(sql,/where user_id = auth\.uid\(\)/,'오류 기록 내보내기는 현재 사용자 데이터만 포함해야 합니다.');
assert.match(db,/client_error_logs:Array\.isArray\(errorLogs\)/,'기존 데이터 내보내기에 오류 기록을 합쳐야 합니다.');
assert.match(worker,/daily-life-shell-v28/,'새 스크립트 배포 시 서비스워커 캐시를 갱신해야 합니다.');
assert.match(worker,/js\/telemetry\.js\?v=20260920-error-logs-v1/,'오류 기록기를 앱 셸에 포함해야 합니다.');
assert.ok(!index.includes('style='),'CSP가 차단하는 인라인 style 속성이 없어야 합니다.');
assert.match(index,/assets\/favicon\.svg/,'배포 페이지에 favicon이 연결돼야 합니다.');
assert.match(privacy,/이메일·작성 내용·인증 토큰은 오류 기록에서 제외하거나 가립니다/,'개인정보처리방침에 최소 오류 정보 처리를 알려야 합니다.');

console.log('error logging contract: PASS');
