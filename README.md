# 하루를 담다 — 웹 테스트 배포본

Google Play 출시를 목표로 개발 중인 개인 생활 기록 앱의 웹 검증본입니다.
일정·할 일·습관·일기·기록·독서록·아이디어·목표·가계부를 개인 공간에 저장하고,
사용자가 직접 선택한 기록만 광장에 공유할 수 있습니다.

현재 4단계 개인 공간과 6단계 광장·커뮤니티 핵심 흐름 검증을 마치고,
7단계 데이터 소유권·계정 관리 기능을 구현하고 있습니다.
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

## 7단계 Supabase 반영

GitHub Pages 배포만으로 데이터 내보내기 RPC와 계정 삭제 서버 함수가 설치되지는 않습니다.

1. Supabase SQL Editor에서 `supabase/step7_data_ownership.sql`을 실행합니다.
2. Supabase CLI로 `supabase functions deploy delete-account`를 실행합니다.
3. Edge Function의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 환경 변수가 준비됐는지 확인합니다. 관리자 비밀키는 저장소나 브라우저 코드에 넣지 않습니다.
4. 승인된 테스트 계정으로 JSON 내보내기와 계정 삭제를 각각 검증합니다. 계정 삭제 검증에는 폐기해도 되는 별도 계정만 사용합니다.

## 남은 검증

7단계 Supabase 반영 후 데이터 내보내기와 폐기용 계정 삭제를 실제 환경에서 검증해야 합니다.
정식 연락처와 정책 문구 확정, Android 앱화, 실제 기기 검사와 Google Play 준비는 후속 단계입니다.
