import fs from 'node:fs';

const [, , sourcePath, targetPath='index.html'] = process.argv;
if(!sourcePath)throw new Error('Usage: node scripts/import-stitch-more-v6.mjs <pasted Stitch html text> [index.html]');

const source=fs.readFileSync(sourcePath,'utf8');
const main=source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
if(!main)throw new Error('Stitch <main> not found');

const routes=['today','calendar','diary','personal','workout','records','books','lab','shelter','forge','today-settings','goals','square','search','bug','contact','support','settings'];
const item='<div class="flex items-center justify-between p-4 cursor-pointer tap-active transition-colors hover:bg-black/[0.01]">';
let routeIndex=0;
let content=main[1]
  .replaceAll(item,()=>item.slice(0,-1)+` data-go="${routes[routeIndex++]}" role="button" tabindex="0">`)
  .replace('<section id="profile-card"','<section id="profile-card" data-go="settings" role="button" tabindex="0"');
if(routeIndex!==routes.length)throw new Error(`Expected ${routes.length} menu rows, found ${routeIndex}`);

const target=fs.readFileSync(targetPath,'utf8');
const page=target.match(/<section id="page-more"[\s\S]*?<\/section>\s*\n\s*<section id="page-shelter"/);
if(!page)throw new Error('Current #page-more section not found');
const replacement=`<section id="page-more" class="page" data-page="more">\n<div class="stitch-more-canvas space-y-6">${content}</div>\n</section>\n\n      <section id="page-shelter"`;
fs.writeFileSync(targetPath,target.replace(page[0],replacement),'utf8');
console.log(`Imported Stitch more v6 screen: ${routes.length} routes, exact content markup`);
