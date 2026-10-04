import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../index.html');
const publicHtml=read('../public.html');
const app=read('../js/app.js');
const publicApp=read('../js/public.js');
const db=read('../js/db.js');
const storage=read('../js/storage.js');
const css=read('../assets/styles.css');
const migration=read('../supabase/step12_profile_photos.sql');

for(const token of ['id="settingsAvatar"','id="settingsAvatarInput"','id="settingsAvatarRemove"','프로필 사진']){
  if(!html.includes(token))throw new Error(`Profile photo settings UI is missing: ${token}`);
}
for(const token of ['selectProfilePhoto','removeProfilePhoto','Storage.uploadProfileImage','profilePhotoRemove','avatarMarkup(p.display_name,p.avatar_path)','avatarMarkup(c.display_name,c.avatar_path','Storage.removePublic(uploadedPath)']){
  if(!app.includes(token))throw new Error(`Profile photo app flow is incomplete: ${token}`);
}
for(const token of ['uploadProfileImage','uniquePath(\'public/profile\'','PUBLIC_BUCKET','cacheControl:\'3600\'']){
  if(!storage.includes(token))throw new Error(`Profile photo storage flow is incomplete: ${token}`);
}
if(!db.includes('patch.avatar_path')||!db.includes('/public/profile/'))throw new Error('Profile avatar path ownership validation is missing');
for(const token of ['add column if not exists avatar_path','profiles_avatar_path_owner_check','get_publication_feed_v2','get_publication_comments_v2','get_blocked_users','get_public_profile','pr.avatar_path']){
  if(!migration.includes(token))throw new Error(`Profile photo migration is incomplete: ${token}`);
}
if(!publicApp.includes('p.avatar_path')||!publicApp.includes('avatar-photo'))throw new Error('Public profile avatar rendering is missing');
if(!publicHtml.includes('20261004-profile-photos-v1'))throw new Error('Public profile cache version is stale');
for(const token of ['.avatar-letter','.avatar .avatar-photo','.profile-photo-editor','.comment-avatar']){
  if(!css.includes(token))throw new Error(`Profile photo style is missing: ${token}`);
}

console.log('profile-photo-contract: PASS');
