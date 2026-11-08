import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync(new URL('../js/more-profile.js',import.meta.url),'utf8');
const context={window:{}};
vm.runInNewContext(code,context);
const {view}=context.window.HaruMoreProfile;
const now=Date.parse('2026-11-08T00:00:00Z');

assert.deepEqual(
  {...view({display_name:'김민서',avatar_path:'user/public/profile/avatar.webp',created_at:'2026-01-01T00:00:00Z'},{created_at:'2026-11-01T00:00:00Z'},now)},
  {displayName:'김민서',avatarPath:'user/public/profile/avatar.webp',days:8,streakText:'기록 8일째'}
);
assert.equal(view({display_name:'사용자'},{}).streakText,'기록 시작');
assert.equal(view({display_name:'  '},{}).displayName,'사용자');
console.log('More profile behavior PASS');
