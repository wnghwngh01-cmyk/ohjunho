import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [config,migration,deletion]=await Promise.all([
  read('js/config.js'),
  read('supabase/step8_public_storage_hardening.sql'),
  read('supabase/functions/delete-account/index.ts')
]);

assert.match(config,/PUBLIC_BUCKET:'lab-public'/,'클라이언트 공개 버킷 이름을 고정해야 합니다.');
assert.match(migration,/'lab-public'[\s\S]*true,[\s\S]*20971520/,'공개 버킷에 20MB 서버 제한을 적용해야 합니다.');
for(const operation of ['insert','update','delete']){
  assert.match(migration,new RegExp(`create policy lab_public_${operation}_owner[\\s\\S]*storage\\.foldername\\(name\\)\\)\\[1\\] = auth\\.uid\\(\\)::text`),`공개 버킷 ${operation}는 경로 소유자만 가능해야 합니다.`);
}
assert.match(migration,/create policy lab_public_read[\s\S]*for select to public/,'공개 사본은 읽을 수 있어야 합니다.');
assert.doesNotMatch(migration,/create policy "Authenticated can (upload|update|delete) portfolio files"/,'레거시 버킷의 전체 인증 사용자 쓰기 정책을 되살리면 안 됩니다.');
assert.match(migration,/Authenticated can delete own portfolio files[\s\S]*storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/,'레거시 공개 파일 삭제도 소유자 경로로 제한해야 합니다.');
assert.match(deletion,/'lab-public'/,'계정 삭제에서 현재 공개 버킷을 정리해야 합니다.');

console.log('public storage contract: PASS');
