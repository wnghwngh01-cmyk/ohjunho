import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const expectedPages=['today','calendar','more','diary','personal','records','books','lab','square','notifications','search','bug','support','settings'];

for(const page of expectedPages){
  if(!html.includes(`data-page="${page}"`))throw new Error(`Missing page section: ${page}`);
  if(!app.includes(`${page}:[`))throw new Error(`Missing page title: ${page}`);
}

const bottom=html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0]||'';
const bottomOrder=[...bottom.matchAll(/data-go="([^"]+)"/g)].map(x=>x[1]);
const wantedBottom=['today','calendar','more','diary','personal'];
if(JSON.stringify(bottomOrder)!==JSON.stringify(wantedBottom))throw new Error(`Unexpected bottom navigation: ${bottomOrder.join(',')}`);

const more=html.match(/<section id="page-more"[\s\S]*?<\/section>/)?.[0]||'';
for(const page of expectedPages.filter(x=>x!=='more'))if(!more.includes(`data-go="${page}"`))throw new Error(`More menu is missing: ${page}`);

const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
if(duplicates.length)throw new Error(`Duplicate ids: ${[...new Set(duplicates)].join(',')}`);

for(const id of ['financePrevMonth','financeNextMonth','financeThisMonth','financeMonthLabel','financeCategorySummary']){
  if(!html.includes(`id="${id}"`))throw new Error(`Finance summary control is missing: ${id}`);
}
for(const behavior of ['moveFinanceMonth(-1)','moveFinanceMonth(1)','renderFinance()']){
  if(!app.includes(behavior))throw new Error(`Finance month behavior is missing: ${behavior}`);
}

console.log('navigation-smoke: PASS');
