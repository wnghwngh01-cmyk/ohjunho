import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [storage,app,index,worker]=await Promise.all([
  read('js/storage.js'),read('js/app.js'),read('index.html'),read('sw.js')
]);

assert.match(storage,/const activeUploads=new Map\(\)/,'업로드 중복 실행 상태를 추적해야 합니다.');
assert.match(storage,/singleFlight\(`record:\$\{recordId\}`/,'같은 기록의 사진 업로드를 한 번만 실행해야 합니다.');
assert.match(storage,/singleFlight\(`project:\$\{projectId\}`/,'같은 프로젝트 파일 업로드를 한 번만 실행해야 합니다.');
assert.match(storage,/await db\(\)\.deleteProjectFile\(row\.id\)/,'프로젝트 묶음 실패 시 앞서 저장된 메타데이터를 되돌려야 합니다.');
assert.match(storage,/removable\.delete\(row\.storage_path\)/,'DB 롤백 실패 시 연결된 실제 파일을 지우지 않아야 합니다.');
assert.match(storage,/removePrivatePaths\(\[\.\.\.removable\]\)/,'롤백 가능한 Storage 파일을 정리해야 합니다.');
assert.match(app,/Storage\.uploadProjectFiles\(p\.id,\[\.\.\.inp\.files\]\)/,'프로젝트 화면은 공통 묶음 업로드를 사용해야 합니다.');
assert.doesNotMatch(app,/for\(const file of \[\.\.\.inp\.files\]\).*Storage\.uploadPrivate/,'화면에서 파일을 개별 저장해 부분 성공을 만들면 안 됩니다.');
assert.match(index,/js\/storage\.js\?v=20260921-upload-recovery-v1/,'새 업로드 코드가 캐시를 우회해야 합니다.');
assert.match(worker,/daily-life-shell-v32/,'서비스워커 캐시를 갱신해야 합니다.');
assert.match(worker,/js\/storage\.js\?v=20260921-upload-recovery-v1/,'서비스워커에 새 업로드 자산을 포함해야 합니다.');

console.log('upload recovery contract: PASS');
