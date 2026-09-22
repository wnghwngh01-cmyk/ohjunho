import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [pkg,config,builder,manifest,androidManifest,gradleVariables,instrumentedTest]=await Promise.all([
  read('package.json'),read('capacitor.config.json'),read('scripts/build-web.mjs'),read('manifest.webmanifest'),
  read('android/app/src/main/AndroidManifest.xml'),read('android/variables.gradle'),
  read('android/app/src/androidTest/java/com/ohjunho/haru/ExampleInstrumentedTest.java')
]);
const parsedPackage=JSON.parse(pkg),parsedConfig=JSON.parse(config);

assert.equal(parsedPackage.private,true,'앱 패키지가 실수로 npm에 공개되면 안 됩니다.');
assert.equal(parsedConfig.appId,'com.ohjunho.haru','Android 앱 식별자는 고정되어야 합니다.');
assert.equal(parsedConfig.appName,'하루를 담다','Android 표시 이름이 제품명과 같아야 합니다.');
assert.equal(parsedConfig.webDir,'dist','Android에는 검토된 웹 산출물만 포함해야 합니다.');
assert.equal(parsedConfig.android.allowMixedContent,false,'Android WebView에서 평문 혼합 콘텐츠를 허용하면 안 됩니다.');
for(const required of ['index.html','privacy.html','terms.html','delete-account.html','reset-password.html','assets','js']){
  assert.match(builder,new RegExp(`['\"]${required.replace('.','\\.')}['\"]`),`${required}가 Android 웹 빌드에 포함되어야 합니다.`);
}
assert.doesNotMatch(manifest,/프로젝트, 작업물/,'폐기된 포트폴리오 설명을 앱 매니페스트에 남기면 안 됩니다.');
assert.match(androidManifest,/android:allowBackup="false"/,'개인 기록 앱을 Android 자동 백업 대상으로 두면 안 됩니다.');
assert.match(androidManifest,/android:usesCleartextTraffic="false"/,'Android 앱에서 평문 HTTP 통신을 허용하면 안 됩니다.');
assert.match(androidManifest,/android\.permission\.INTERNET/,'Supabase 연결을 위해 인터넷 권한이 필요합니다.');
assert.match(gradleVariables,/compileSdkVersion = 36/,'Android 16 SDK로 컴파일해야 합니다.');
assert.match(gradleVariables,/targetSdkVersion = 36/,'2026년 Google Play 제출 기준인 API 36을 대상으로 해야 합니다.');
assert.match(instrumentedTest,/com\.ohjunho\.haru/,'Android 기기 검사가 실제 application ID를 확인해야 합니다.');

console.log('android scaffold contract: PASS');
