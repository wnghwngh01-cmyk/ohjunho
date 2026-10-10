import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../index.html'),publicHtml=read('../public.html'),app=read('../js/app.js'),db=read('../js/db.js'),publicApp=read('../js/public.js'),css=read('../assets/avatar-frame.css'),sql=read('../supabase/step20_avatar_frames.sql');
const context={window:{}};
vm.runInNewContext(read('../js/avatar-frame.js'),context);
const frame=context.window.HaruAvatarFrame;
assert.equal([...frame.tiers].join(','),'none,simple,spectrum,blossom,crown');
assert.equal([...frame.colors].join(','),'sage,rose,sky,lilac,gold,rainbow');
assert.equal(frame.safeTier('<svg>'),'none');
assert.equal(frame.safeColor('javascript:alert(1)'),'sage');
assert.match(frame.art('blossom'),/avatar-frame-art/);
assert.match(frame.art('crown'),/avatar-frame-art/);
for(const tier of frame.tiers){assert.equal(frame.safeColor('rainbow',tier),['spectrum','blossom','crown'].includes(tier)?'rainbow':'sage');assert.equal(frame.colorsFor(tier).includes('rainbow'),['spectrum','blossom','crown'].includes(tier));}
assert.equal(frame.art('simple'),'');
for(const file of ['ribbon-v2.png','blossom-v3.png','crown-v3.png'])assert.ok(fs.statSync(new URL('../assets/profile-frames/'+file,import.meta.url)).size>1000);
assert.ok(css.includes('blossom-v3.png')&&css.includes('crown-v3.png')&&css.includes('filter:none'));
for(const amount of ['1000','5000','10000','30000'])assert.match(html,new RegExp(`data-support-amount="${amount}"`));
for(const id of ['settingsFrameOpen','profileFramePanel','frameTierOptions','frameColorOptions'])assert.ok(html.includes(`id="${id}"`),id);
for(const source of [html,publicHtml])assert.ok(source.includes('avatar-frame.css?v=20261010-avatar-frame-v5'));
for(const source of [app,db,publicApp,sql])assert.ok(source.includes('avatar_frame_tier')&&source.includes('avatar_frame_color'));
assert.ok(app.includes('avatar_frame_tier:state.frameDraftTier')&&app.includes('renderProfilePhotoEditor();renderFrameEditor()'));
assert.ok(db.includes("client.rpc('get_avatar_frames'"));
assert.ok(publicApp.includes("db.rpc('get_avatar_frames'"));
assert.ok(sql.includes('p.public_profile = true or p.id = auth.uid()'));
assert.ok(css.includes('data-frame-tier="spectrum"')&&css.includes('data-frame-color="rainbow"'));
console.log('avatar-frame-contract: PASS');
