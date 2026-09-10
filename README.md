# Personal Lab — 4단계 테스트 배포본

2026-09-10 현재 work/project/www 복사본. 출시용 또는 4단계 완료본이 아닙니다.
기존 Supabase에 연결되므로 테스트 계정으로 사용하세요. 공개/커뮤니티 기능은 잠겨 있습니다.

## GitHub 업로드

1. ZIP을 컴퓨터에서 압축 해제합니다.
2. 테스트용 GitHub 저장소에서 Add file → Upload files를 엽니다.
3. 이 폴더 안의 파일과 assets, js 폴더를 함께 올립니다. ZIP 자체나 바깥 폴더를 올리는 것이 아닙니다.
4. Commit changes로 저장합니다. 저장소 첫 화면에 index.html, assets, js가 보여야 합니다.
5. Settings → Pages → Deploy from a branch → main → /(root) → Save를 선택합니다.
6. 배포 후 Pages에 표시되는 HTTPS 주소로 접속합니다.

도메인은 기본 GitHub Pages 주소에서 동작을 확인한 다음 연결합니다. CNAME은 아직 넣지 않았습니다.
Supabase 이메일 인증 링크를 사용할 때는 해당 배포 주소를 Auth의 URL Configuration에 맞춰 설정해야 합니다.

## 포함/제외

앱 HTML, JS, CSS, 이미지, 웹 manifest만 포함합니다. SQL, 테스트 출력, 대화, 개인 파일, 비밀번호는 포함하지 않습니다.
config.js의 Supabase publishable key는 브라우저용 공개 연결 키입니다. service-role 키를 넣지 마세요.

## 남은 검증

과정 파일 저장의 타이머 의존, 습관 편집 오류, 범위 일정 표시, 로그인 후 모바일 화면 등의 수정·검증이 남아 있습니다.
이 업로드 패키지는 원격 브라우저 테스트 환경을 마련하기 위한 것입니다.
