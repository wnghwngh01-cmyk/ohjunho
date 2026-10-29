# 하루를 담다 코드 안내서

다른 개발자나 AI가 현재 코드를 처음 열었을 때 기능 위치와 안전 경계를 빠르게 찾기 위한 문서다. 현재 실행 코드가 기준이며, 과거 대화나 완료 보고는 참고 자료일 뿐이다.

## 실행 구조

- `index.html`: 로그인 뒤 사용하는 단일 페이지 앱의 화면 구조와 스크립트 로딩 순서
- `js/app.js`: 인증 이후 화면 전환, 상태, 이벤트 연결, 페이지 렌더링을 조합하는 메인 컨트롤러
- `js/db.js`: Supabase 인증 사용자 데이터의 조회·저장·검증 경계. 모든 개인 데이터 요청은 `user_id`로 소유자를 제한한다.
- `js/*-ui.js`: 예산, 정기 거래, 운동처럼 독립적인 상태와 상호작용이 큰 기능
- `assets/styles.css`: 공통·기존 스타일
- `assets/light-theme.css`: 밝은 테마 보정
- `assets/today-stitch.css`: 승인된 오늘 페이지 시안
- `sw.js`: 오프라인 셸 캐시. 배포 자산 URL이 바뀌면 캐시 이름과 목록도 함께 갱신한다.
- `scripts/build-web.mjs`: GitHub Pages와 Capacitor가 공유하는 `dist/` 정적 번들 생성
- `android/`: Capacitor Android 네이티브 프로젝트
- `supabase/`: 스키마 마이그레이션, RLS/RPC, Edge Function
- `tests/`: 브라우저 전체 자동화가 아닌 계약·동작·로컬 DB 중심 회귀 검사

## 기능별 위치

| 기능 | UI/로직 | 저장·서버 | 주요 검사 |
| --- | --- | --- | --- |
| 오늘·캘린더·기록·일기·독서록·아이디어·광장·설정 | `index.html`, `js/app.js` | `js/db.js`, `js/storage.js` | `tests/navigation-smoke.mjs`, 기능별 contract 테스트 |
| 월 예산 | `js/budget-ui.js`, `assets/budget.css` | `js/db.js`, 예산 마이그레이션 | `tests/monthly-budget-behavior.mjs`, `tests/budget-ui-behavior.mjs` |
| 정기 수입·지출 | `js/recurring-ui.js`, `assets/recurring.css` | `js/db.js`, Supabase 스케줄/RPC | `tests/recurring-ui-behavior.mjs`, 관련 DB 테스트 |
| 작성 양식 | `js/writing-templates.js`, `assets/writing-templates.css` | 본문·임시저장은 기존 기록 흐름 사용 | `tests/writing-templates-behavior.mjs` |
| 운동·단백질 | `js/workout-ui.js`, `assets/workout.css` | `js/db.js`, 운동 마이그레이션 | `tests/workout-contract.mjs`, `tests/workout-db-behavior.mjs` |
| 프로필 테두리 | `js/avatar-frame.js`, `assets/avatar-frame.css`, `assets/profile-frames/` | 프로필 색상 필드 | `tests/avatar-frame-*.mjs` |
| 운영자 웹 | `admin.html`, `js/admin.js`, `js/admin-data.js` | 운영자 RPC/Edge Function | 운영자 전용 테스트 |

## 데이터 흐름

1. `index.html`이 Supabase SDK와 `js/config.js`를 먼저 로드한다.
2. `js/db.js`가 세션을 확인하고 `window.LabDB` API를 제공한다.
3. 독립 UI 모듈이 `LabDB`를 주입받아 저장·조회를 요청한다.
4. `js/app.js`가 인증 상태와 현재 페이지를 기준으로 필요한 모듈을 렌더링한다.
5. 사진·문서는 `js/storage.js`가 Storage 경로와 공개 범위를 관리한다.

## 반드시 유지할 호환 규칙

- 신규 시작 잔액 입력은 제거됐지만 과거 `balance` 거래는 조회·검색·집계 호환을 위해 남아 있다. 사용자 데이터 마이그레이션 없이 관련 코드를 삭제하면 안 된다.
- 개인 기록 원본은 운영자에게도 공개하지 않는다. 광장 공유 사본, 신고, 문의만 운영 범위다.
- 월 예산은 월별 기록을 보존하고 다음 달 기본값만 이어받는다. 지출 사용액은 실제 거래에서 계산한다.
- 정기 거래 설정 변경은 이미 생성된 과거 거래를 수정하지 않는다. 서버 측 중복 키와 실행 로그를 보존한다.
- 작성 양식은 편집 가능한 일반 텍스트를 삽입하며 기존 본문을 덮어쓰지 않는다.
- 프로필 테두리 등급은 현재 결제 권한이 아니라 테스트용 선택 상태다. 실제 상품 결제와 연결됐다고 표현하지 않는다.

## 제거된 기능과 자산

- 오늘 페이지의 `1년 전 오늘` 카드는 사용자 결정으로 제거됐다. 대시보드도 더 이상 1년 전 기록을 조회하지 않는다.
- 프로필 테두리는 현재 `ribbon-v3.png`, `blossom-v5.png`, `crown-v3.png`만 사용한다. 이전 시안 파일은 Git 기록에서 확인할 수 있다.

## 안전한 변경 순서

1. 변경 전 관련 HTML, UI 모듈, `js/db.js`, 테스트를 함께 읽는다.
2. 사용자 관점 완료 조건과 저장/조회/오류 상태를 정한다.
3. 작은 범위로 구현하고 관련 테스트와 `node --check`를 실행한다.
4. `pnpm run build:web`으로 `dist/` 생성 여부를 확인한다.
5. DB 변경은 별도 마이그레이션 적용 상태를 명시한다.
6. 배포 후 GitHub Pages 빌드 완료와 원격 자산 내용을 확인한다.

## 현재 검증 경계

정적·로컬 DB 테스트 통과는 실제 Supabase, 로그인 브라우저, Android 기기 검증과 다르다. 결과 보고에는 각각을 구분하고, 수행하지 않은 검사를 완료로 적지 않는다.
