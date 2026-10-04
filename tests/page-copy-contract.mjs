import fs from 'node:fs';

const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

const subtitles=['오늘을 한눈에','생각을 놓치지 않는 곳','날짜로 보는 하루','돈의 흐름 한눈에','떠오른 생각 보관함','기분과 함께 남기는 하루','읽고 남긴 생각','방향을 정하는 곳','내 기록을 한곳에서','놓치지 말아야 할 소식','불편을 알려주세요','하루를 담다 응원하기','필요한 기능 모아보기','함께 나누는 이야기','내 공간 관리'];
for(const copy of subtitles){
  if(!app.includes(copy))throw new Error(`Missing page subtitle: ${copy}`);
}

const descriptions=['스쳐 가는 생각과 기억을 형식 없이 편하게 남겨보세요.','일정과 중요한 날, 습관의 흐름을 달력에서 한눈에 살펴보세요.','수입과 지출을 기록하고 현재 잔액과 월별 흐름을 확인해보세요.','문득 떠오른 생각을 사진과 함께 저장하고 다시 발전시켜보세요.','오늘의 기분과 이야기를 날짜별로 기록하고 지난 하루를 찾아보세요.','읽고 싶은 책부터 완독한 책까지 감상과 함께 차곡차곡 정리해보세요.','기록과 일기, 독서록, 자유로운 생각을 선택해 다른 사용자와 나눠보세요.'];
for(const copy of descriptions){
  if(!html.includes(copy))throw new Error(`Missing page description: ${copy}`);
}
if(app.includes('선택해서 들어가는 커뮤니티')||html.includes('내 하루 공간이 먼저입니다.')||html.includes('class="square-intro"')||html.includes('서로의 하루와 생각을 가볍게 나누는 곳'))throw new Error('Old placeholder page copy is still present');

console.log('page-copy-contract: PASS');
