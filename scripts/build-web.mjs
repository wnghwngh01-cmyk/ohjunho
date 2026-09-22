import {cp, mkdir, rm} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'dist');
const files=[
  'index.html','public.html','privacy.html','terms.html','delete-account.html',
  'reset-password.html','manifest.webmanifest','sw.js','assets','js'
];

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const file of files)await cp(resolve(root,file),resolve(output,file),{recursive:true});
console.log(`web build: ${files.length} entries copied to dist`);
