// Imports the final Stitch More screen (static export of Stitch screen "_4", 2026-11-20) into index.html.
// The Stitch markup is kept as-is; only app hooks are added:
//   - ids for live profile data, the in-page notification bell and its unread dot
//   - data-go routes on the 18 menu rows and the profile card
//   - the forge row keeps the sword icon the user picked earlier (commits 687aa8e / 329bc82)
// Usage: node scripts/import-stitch-more-v7.mjs <static More code.html> [index.html]
import fs from 'node:fs';

const [, , sourcePath, targetPath = 'index.html'] = process.argv;
if (!sourcePath) throw new Error('Usage: node scripts/import-stitch-more-v7.mjs <static More code.html> [index.html]');

const source = fs.readFileSync(sourcePath, 'utf8');
const container = source.match(/<div class="w-full max-w-\[420px\] mx-auto space-y-4" id="moreApp">([\s\S]*?)<\/div>\s*<\/body>/);
if (!container) throw new Error('Stitch #moreApp container not found');
// Stitch's renderer wraps long opening tags across lines; collapse whitespace inside tags only (text and classes unchanged).
let content = container[1].trim().replace(/<([a-zA-Z][\w-]*)\s+([^<>]*?)\s*>/g, (m, tag, attrs) => `<${tag} ${attrs.replace(/\s+/g, ' ').trim()}>`);

const routes = ['today', 'calendar', 'diary', 'personal', 'workout', 'records', 'books', 'lab', 'shelter', 'forge', 'today-settings', 'goals', 'square', 'search', 'bug', 'contact', 'support', 'settings'];
let routeIndex = 0;
content = content.replace(/<div\s+class="(flex items-center justify-between p-3\.5 cursor-pointer tap-active transition-colors[^"]*)">/g, (m, cls) => `<div class="${cls.trim()}" data-go="${routes[routeIndex++]}" role="button" tabindex="0">`);
if (routeIndex !== routes.length) throw new Error(`Expected ${routes.length} menu rows, found ${routeIndex}`);

const replaceOnce = (from, to, label) => {
  if (!content.includes(from)) throw new Error(`Missing Stitch markup: ${label}`);
  content = content.replace(from, to);
};

// In-page header bell (the global topbar is hidden on this page).
replaceOnce('<button aria-label="알림" class="w-10 h-10 rounded-full', '<button id="moreNotifications" type="button" data-go="notifications" aria-label="알림" class="w-10 h-10 rounded-full', 'header bell');
replaceOnce('<span class="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#B45650] ring-2 ring-[#FAF9F6]"></span>', '<span id="moreNotificationDot" class="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#B45650] ring-2 ring-[#FAF9F6] hidden"></span>', 'bell dot');

// Profile card with live data.
replaceOnce('<div class="bg-white rounded-2xl p-4 shadow-sm border border-[#F0EFEA] flex items-center justify-between cursor-pointer tap-active transition-colors">', '<div id="profile-card" data-go="settings" role="button" tabindex="0" class="bg-white rounded-2xl p-4 shadow-sm border border-[#F0EFEA] flex items-center justify-between cursor-pointer tap-active transition-colors">', 'profile card');
// Sample data (민 / 김민서 님 / 기록 128일째) is replaced by the signed-in user's data at runtime (fillProfileUI).
content = content.replace(/<div class="(w-12 h-12 rounded-full bg-\[#F4F3F0\] text-\[#1E3A2F\] flex items-center justify-center text-base font-bold flex-shrink-0)">\s*[^<]*\s*<\/div>/, (m, cls) => `<div id="user-avatar-initial" class="${cls}"></div>`);
content = content.replace(/<span class="text-base font-bold text-\[#1C1D1B\]">[^<]*<\/span>/, '<span id="user-name" class="text-base font-bold text-[#1C1D1B]"></span>');
content = content.replace(/<span class="text-\[11px\] font-medium px-2 py-0\.5 rounded-full bg-\[#F4F3F0\] text-\[#78756F\]">[^<]*<\/span>/, '<span id="user-streak" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F4F3F0] text-[#78756F]"></span>');
for (const id of ['user-name', 'user-streak']) if (!content.includes(`id="${id}"`)) throw new Error(`Missing Stitch markup: ${id}`);
if (!content.includes('id="user-avatar-initial"')) throw new Error('Missing Stitch markup: avatar');

// Keep the user's chosen forge (sword) icon.
const designForge = '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4.5L19.5 9.5L10 19L5 20L6 15L14.5 4.5Z"></path><path d="M13 6L18 11"></path><path d="M3 21L7 17"></path></svg>';
const userForge = '<svg class="w-5 h-5" id="icon-forge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"></path><path d="M13 19l6-6"></path><path d="M16 16l4 4"></path><path d="M19 21l2-2"></path></svg>';
replaceOnce(designForge, userForge, 'forge icon');

// Bug-report icon: the Stitch legs (x 6→10 / 14→18) ran into the body (x 8–16); they now stop at the body edge.
replaceOnce('<path d="M6 10h4"></path><path d="M14 10h4"></path><path d="M6 15h4"></path><path d="M14 15h4"></path>', '<path d="M4 10h4"></path><path d="M16 10h4"></path><path d="M4 15h4"></path><path d="M16 15h4"></path>', 'bug icon legs');

// The Stitch screen drops the footer, but the user decided to show the app version (1.1.0) until release,
// so the previously approved footer meta is kept below the menus (version comes from js/app-version.js).
content += `\n<footer class="pt-2 pb-6 text-center text-xs text-gray-400 space-y-1">\n  <p class="font-medium text-gray-500">하루를 담다 · v<span id="appVersionLabel"></span></p>\n  <p class="text-[11px] text-gray-400">나의 하루를 안전하고 고요하게 담는 일상 앱</p>\n</footer>`;

const target = fs.readFileSync(targetPath, 'utf8');
const page = target.match(/<section id="page-more"[\s\S]*?<\/section>\s*\r?\n\s*<section id="page-shelter"/);
if (!page) throw new Error('Current #page-more section not found');
const replacement = `<section id="page-more" class="page" data-page="more">\n<div class="stitch-more-canvas w-full max-w-[420px] mx-auto space-y-4">\n${content}\n</div>\n</section>\n\n      <section id="page-shelter"`;
fs.writeFileSync(targetPath, target.replace(page[0], replacement), 'utf8');
console.log(`Imported Stitch More v7: ${routes.length} routes, profile + bell hooks, user forge icon kept`);
