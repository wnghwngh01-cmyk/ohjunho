# 하루를 담다 — 웹 테스트 배포본

Google Play 출시를 목표로 개발 중인 개인 생활 기록 앱의 웹 검증본입니다.
일정·할 일·습관·일기·기록·독서록·아이디어·목표·가계부를 개인 공간에 저장하고,
사용자가 직접 선택한 기록만 광장에 공유할 수 있습니다.

현재 4단계 개인 공간 검증을 마치고 광장·커뮤니티 기능을 검증하고 있습니다.
기존 Supabase에 연결되므로 개발 중에는 승인된 테스트 계정만 사용하세요.

## GitHub 업로드

1. ZIP을 컴퓨터에서 압축 해제합니다.
2. 테스트용 GitHub 저장소에서 Add file → Upload files를 엽니다.
3. 이 폴더 안의 파일과 assets, js 폴더를 함께 올립니다. ZIP 자체나 바깥 폴더를 올리는 것이 아닙니다.
4. Commit changes로 저장합니다. 저장소 첫 화면에 index.html, assets, js가 보여야 합니다.
5. Settings → Pages → Deploy from a branch → main → /(root) → Save를 선택합니다.
6. 배포 후 Pages에 표시되는 HTTPS 주소로 접속합니다.

기본 배포 주소는 `https://ohjunho.com`이며 독립 로그인 검사용으로
`https://test1.ohjunho.com`, `https://test2.ohjunho.com`을 사용합니다.
Supabase 이메일 인증 링크를 사용할 때는 배포 주소를 Auth URL Configuration에 등록해야 합니다.

## 포함/제외

저장소에는 앱 HTML, JS, CSS, 웹 manifest, 마이그레이션과 회귀 검사 코드가 포함됩니다.
대화, 개인 파일, 비밀번호와 관리자 비밀키는 포함하지 않습니다.
config.js의 Supabase publishable key는 브라우저용 공개 연결 키입니다. service-role 키를 넣지 마세요.

## 남은 검증

광장의 팔로우·팔로워 공개·차단·신고·개선 제안을 두 테스트 계정으로 검증해야 합니다.
Android 앱화, 실제 기기 검사와 Google Play 준비는 후속 단계입니다.
