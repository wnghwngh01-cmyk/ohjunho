# Android 개발 환경

## 현재 기준

- 앱 이름: `하루를 담다`
- Android application ID: `com.ohjunho.haru`
- Capacitor: `8.5.2`
- min SDK: 24
- compile / target SDK: 36
- 웹 산출물: `dist/` (Git에는 포함하지 않음)

## 필요한 로컬 도구

1. Android Studio와 JDK 21을 설치한다. Android Studio에 포함된 JDK가 더 최신이어도 이 프로젝트의 Gradle 빌드에는 JDK 21을 사용한다.
2. Android Studio SDK Manager에서 Android 16 (API 36), Android SDK Platform-Tools, Android SDK Build-Tools를 설치한다.
3. 실제 기기 또는 API 36 에뮬레이터를 준비한다.

현재 개발 컴퓨터에는 Android Studio, Microsoft OpenJDK 21, Android API 36 SDK, Build Tools, Platform Tools가 준비되어 있다. `assembleDebug`와 `testDebugUnitTest`는 2026-09-22에 실제 통과했다. 에뮬레이터와 실제 기기 검증은 별도 단계로 남아 있다.

## 동기화와 빌드

```powershell
pnpm install
pnpm run android:sync
cd android
$env:JAVA_HOME='C:\Users\wnghw\AppData\Local\Java\microsoft-jdk-21\jdk-21.0.12.1+1'
.\gradlew.bat assembleDebug
```

디버그 APK는 `android/app/build/outputs/apk/debug/app-debug.apk`에 생성된다. 다른 컴퓨터에서는 설치된 JDK 21 경로에 맞게 `JAVA_HOME`을 바꾼다.

Android Studio에서 열 때는 저장소 루트에서 `pnpm run android:open`을 실행한다.

웹 코드를 바꾼 뒤에는 반드시 `pnpm run android:sync`를 다시 실행한다. 이 명령은 배포용 웹 파일만 `dist/`에 복사한 다음 Android assets와 동기화한다.

## 보안 기본값

- Android 자동 백업 비활성화
- 평문 HTTP 통신 비활성화
- 현재 선언된 Android 권한은 인터넷 접근뿐
- Supabase 관리자 키는 앱에 포함하지 않음

릴리스 서명 키는 저장소에 커밋하지 않는다. 키 생성과 Play App Signing 연결은 Play Console 준비 단계에서 별도로 수행한다.
