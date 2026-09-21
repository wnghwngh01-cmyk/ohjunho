import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [sql,db,app,index,sw,terms]=await Promise.all([
  read('supabase/step8_personal_data_restore.sql'),read('js/db.js'),read('js/app.js'),
  read('index.html'),read('sw.js'),read('terms.html')
]);

assert.match(sql,/security definer/,'복원은 서버 트랜잭션에서 실행해야 합니다.');
assert.match(sql,/v_source_uid is distinct from v_uid/,'다른 계정의 백업을 복원하면 안 됩니다.');
assert.match(sql,/pg_column_size\(p_backup\) > 10485760/,'서버에서도 백업 크기를 제한해야 합니다.');
assert.match(sql,/v_total > 20000/,'과도한 복원 행을 서버에서 거부해야 합니다.');
assert.match(sql,/where records\.user_id=v_uid/,'ID 충돌 시 다른 사용자의 기록을 갱신하면 안 됩니다.');
assert.match(sql,/from public\.habits h where h\.id=x\.habit_id and h\.user_id=v_uid/,'습관 체크는 현재 사용자의 습관에만 연결해야 합니다.');
assert.match(sql,/select x\.id,v_uid,x\.legacy_id,x\.category,x\.title,x\.description,x\.link,null,null,null,null/,'원본 없는 파일 경로를 복원하면 안 됩니다.');
assert.match(sql,/revoke all on function public\.restore_my_data\(jsonb\) from public/,'익명 복원 실행 권한을 제거해야 합니다.');
assert.match(sql,/grant execute on function public\.restore_my_data\(jsonb\) to authenticated/,'로그인 사용자에게만 복원 RPC를 허용해야 합니다.');
assert.match(db,/client\.rpc\('restore_my_data',\{p_backup:backup\}\)/,'클라이언트는 복원 RPC를 사용해야 합니다.');
assert.match(app,/file\.size>10\*1024\*1024/,'클라이언트에서도 파일 크기를 먼저 확인해야 합니다.');
assert.match(app,/backup\.profiles\[0\]\?\.id!==DB\.user\(\)\.id/,'클라이언트에서 계정 불일치를 알려야 합니다.');
assert.match(app,/현재 데이터는 삭제하지 않습니다\. 첨부파일과 광장 활동은 자동 복원하지 않습니다/,'복원 범위를 확인창에서 밝혀야 합니다.');
assert.match(index,/id="restoreDataFile"/,'설정에 복원 파일 입력이 있어야 합니다.');
assert.match(sw,/daily-life-shell-v29/,'복원 자산을 위해 서비스워커 캐시를 갱신해야 합니다.');
assert.doesNotMatch(terms,/사용자용 복원 기능은 현재 제공하지 않습니다/,'약관에 폐기된 설명이 남으면 안 됩니다.');

console.log('data restore contract: PASS');
