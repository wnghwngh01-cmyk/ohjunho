import assert from 'node:assert/strict';
import fs from 'node:fs';

// Google Play requires a reachable contact on the privacy policy; the account deletion page must show it too.
const contact='wnghwngh01@gmail.com';
for(const page of ['privacy.html','terms.html','delete-account.html']){
  const html=fs.readFileSync(page,'utf8');
  assert.doesNotMatch(html,/CONTACT_EMAIL/,`${page} must not ship the CONTACT_EMAIL placeholder`);
  assert.ok(html.includes(`<a href="mailto:${contact}">${contact}</a>`),`${page} shows the public contact email`);
}
console.log('public contact contract: PASS (privacy, terms, delete-account)');
