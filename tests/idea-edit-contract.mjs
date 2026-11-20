import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('js/app.js','utf8');
const db=fs.readFileSync('js/db.js','utf8');
const html=fs.readFileSync('index.html','utf8');

// Owner-scoped update of title and memo only (photos, status and project link stay as they are).
const update=db.match(/async function updateIdea\(id,payload\)\{[^\n]*/)?.[0]||'';
assert.ok(update,'LabDB.updateIdea exists');
assert.match(update,/\.update\(\{title,body,updated_at:new Date\(\)\.toISOString\(\)\}\)\.eq\('id',id\)\.eq\('user_id',uid\(\)\)/);
assert.match(update,/if\(!title\)throw new Error\('아이디어 제목을 입력해 주세요\.'\)/);
assert.doesNotMatch(update,/status|project_id|idea_media'\)\.delete/,'editing never touches status, project link or photos');
assert.match(db,/addIdea,updateIdea,/);

// Each idea card offers 수정 next to 삭제, and the composer switches into edit mode.
assert.match(app,/<button class="link-btn" data-edit-idea="\$\{i\.id\}">수정<\/button><button class="link-btn danger" data-delete-idea="\$\{i\.id\}">삭제<\/button>/);
assert.match(app,/const editIdea=e\.target\.closest\('\[data-edit-idea\]'\);if\(editIdea\)\{startIdeaEdit\(editIdea\.dataset\.editIdea\);return\}/);
assert.match(app,/async function addIdea\(\)\{if\(state\.ideaEdit\)return saveIdeaEdit\(\);/,'saving while editing updates instead of creating a duplicate');
assert.match(app,/\$\('#ideaImages'\)\.closest\('\.photo-picker'\)\?\.classList\.toggle\('hidden',editing\)/,'photo picker is hidden while editing');
assert.match(app,/setBusy\(button,false\);setIdeaEditMode\(null\);/,'busy state is cleared before the button label resets');
assert.match(html,/<button id="ideaCancel" class="btn secondary hidden" type="button">수정 취소<\/button>/);
assert.match(app,/\$\('#ideaCancel'\)\.addEventListener\('click',\(\)=>setIdeaEditMode\(null\)\)/);

console.log('idea edit contract: PASS (owner-scoped update, edit mode, cancel, photos untouched)');
