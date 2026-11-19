import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('js/app.js','utf8');
const css=fs.readFileSync('assets/bottom-nav.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

// #2 Android hardware back must not close the app from inner pages.
assert.ok(pkg.dependencies['@capacitor/app'],'@capacitor/app provides the backButton event');
assert.match(app,/history\.replaceState\(\{haruPage:'today',haruRoot:true\}/,'the first history entry is marked as the root');
const back=app.match(/function handleNativeBack\(\)\{[\s\S]*?\n  \}/)?.[0]||'';
assert.ok(back,'handleNativeBack exists');
const order=['lightbox','modal-backdrop.show','haruRoot',"route('today'",'minimizeApp'].map(token=>back.indexOf(token));
assert.ok(order.every(i=>i>=0),'back handles overlays, history, Today fallback and minimize');
assert.deepEqual([...order].sort((a,b)=>a-b),order,'back order: overlays → in-app history → Today → background');
assert.doesNotMatch(back,/exitApp/,'back never kills the app process');
assert.match(app,/addListener\('backButton',\(\)=>handleNativeBack\(\)\)/);

// #13 Keyboard hides the shared bottom navigation.
assert.match(app,/classList\.toggle\('keyboard-open',typing&&h<viewportBase\*0\.78\)/);
assert.match(css,/html\.keyboard-open \.app-shell \.bottom-nav\{visibility:hidden!important;pointer-events:none!important\}/);

console.log('native shell contract: PASS (back button order, keyboard hides bottom nav)');
