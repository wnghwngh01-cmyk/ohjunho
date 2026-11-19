'use strict';
/*
 * Single source of the app version.
 * - name: the user-facing version (More footer, Android versionName, Play listing). Keep 1.1.0 until release.
 * - code: Android versionCode. Must increase by at least 1 for every APK/AAB that is installed over or uploaded after another one.
 * android/app/build.gradle reads both values from this file.
 */
window.HARU_APP_VERSION=Object.freeze({name:'1.1.0',code:3});
(function(){const fill=()=>document.querySelectorAll('#appVersionLabel,[data-app-version]').forEach(el=>{el.textContent=window.HARU_APP_VERSION.name});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fill);else fill()})();
