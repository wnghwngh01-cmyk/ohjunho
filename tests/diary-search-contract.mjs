import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/diary-utils.js','utf8'),context);
const {filterRows}=context.HaruDiarySearch;

const rows=[
  {id:'1',category:'일상',entry_date:'2026-10-02',mood:'🙂 좋음',title:'산책한 날',body:'저녁에 강변을 걸었다.',created_at:'2026-10-02T12:00:00Z'},
  {id:'2',category:'일상',entry_date:'2026-10-01',mood:'😌 평온',title:'독서',body:'산책 대신 집에서 책을 읽었다.',created_at:'2026-10-01T12:00:00Z'},
  {id:'3',category:'독서',entry_date:'2026-10-02',mood:'🙂 좋음',title:'산책',body:'일기가 아닌 기록',created_at:'2026-10-02T13:00:00Z'}
];

assert.deepEqual(filterRows(rows,{}).map(x=>x.id),['1','2'],'일기만 최신 날짜순으로 보여야 한다.');
assert.deepEqual(filterRows(rows,{query:'산책'}).map(x=>x.id),['1','2'],'제목과 본문 모두 키워드 검색 대상이어야 한다.');
assert.deepEqual(filterRows(rows,{date:'2026-10-01'}).map(x=>x.id),['2'],'날짜는 선택한 하루와 정확히 일치해야 한다.');
assert.deepEqual(filterRows(rows,{mood:'🙂 좋음'}).map(x=>x.id),['1'],'기분 필터가 적용되어야 한다.');
assert.deepEqual(filterRows(rows,{query:'강변',date:'2026-10-02',mood:'🙂 좋음'}).map(x=>x.id),['1'],'여러 검색 조건을 동시에 적용해야 한다.');
assert.equal(filterRows(rows,{query:'없는 말'}).length,0,'일치하지 않는 검색은 빈 결과여야 한다.');

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8');
for(const id of ['diarySearch','diarySearchDate','diarySearchMood','diarySearchReset','diarySearchSummary'])assert.match(html,new RegExp(`id="${id}"`));
assert.match(app,/Diary\.filterRows\(all,filters\)/);
assert.match(app,/조건에 맞는 일기가 없습니다/);
assert.match(app,/diarySearchReset'\)\.addEventListener\('click',resetDiarySearch\)/);

console.log('diary search contract: PASS');
