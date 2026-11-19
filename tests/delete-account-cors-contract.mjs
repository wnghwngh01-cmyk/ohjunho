import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../supabase/functions/delete-account/index.ts',import.meta.url),'utf8');
const capacitor=JSON.parse(fs.readFileSync(new URL('../capacitor.config.json',import.meta.url),'utf8'));

const match=source.match(/const allowedOrigins = new Set\(\[([^\]]*)\]\)/);
assert.ok(match,'delete-account must declare an explicit allowedOrigins set');
const origins=new Set([...match[1].matchAll(/'([^']+)'/g)].map(m=>m[1]));

for(const web of ['https://ohjunho.com','https://test1.ohjunho.com','https://test2.ohjunho.com']){
  assert.ok(origins.has(web),`web origin ${web} must stay allowed`);
}

// The Android app loads its bundled web assets from Capacitor's local server.
// With no server.hostname / androidScheme override the WebView origin is https://localhost.
const scheme=capacitor.server?.androidScheme||'https';
const host=capacitor.server?.hostname||'localhost';
const androidOrigin=`${scheme}://${host}`;
assert.equal(androidOrigin,'https://localhost','Capacitor Android origin changed; update delete-account allowedOrigins to match');
assert.ok(origins.has(androidOrigin),'in-app account deletion must allow the Android app origin https://localhost');

assert.ok(!origins.has('*')&&![...origins].some(o=>o.startsWith('http://')),'only explicit https origins may be allowed');
assert.match(source,/origin && allowedOrigins\.has\(origin\) \? origin :/,'CORS must echo only allowed origins');
assert.match(source,/'Vary': 'Origin'/,'CORS response must vary by Origin');

console.log('delete-account CORS contract: PASS (web + Android app origins)');
