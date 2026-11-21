# Stitch 수정 프롬프트 1차: 광장 화면 (2026-11-20)

대상: "하루를 담다 - 광장 (발견)"(export stitch_ui/_23), "하루를 담다 - 광장 (앱 개선)"(stitch_ui/_22)

1차 결과 검토
- 잘 된 점: 제목·알림함 없음, 탭 3개, 자유글 쓰기 접힘, 분류 칩 6개 가로 스크롤, 예시 카드 4장(사진·독서록 댓글·내 글 메뉴·대장간 빈 자리), 댓글/답글/입력 줄, 앱 개선 안내·접힘·추천 버튼·상태 배지, 스크립트 렌더링 없음, style 속성 0, 외부 이미지 0, whitespace-nowrap 적용.
- 문제: 탭·칩·입력칸이 가계부 규격과 다름(새 회색 #F0EFEA, text-sm, rounded-2xl 등) / 안내 상자에 팔레트에 없는 색(#FDE3C8, #824B0E) / "더보기"를 글 안에 "..."로 직접 적고 문단 안에 버튼을 넣음(실제 글 길이에 맞지 않음) / 댓글 칭호 배지에 없는 클래스 py-0.2 / "👍 멋져요 45"가 한 덩어리라 숫자만 바꿀 수 없음 / 일기 배지 색과 "검토 후 계획"·"보류" 배지 모양이 없음.
- 사용자 입장에서 추가: "내 글" 표시, 답글 대상 표시 + 취소, 글자 수 카운터, 사진 5장 이상(+N) 모양.

---

방금 만든 "광장 (발견)"과 "광장 (앱 개선)" 화면 2장을 아래 항목만 고쳐 주세요. 적힌 것 외의 디자인·배치·문구는 그대로 두세요. 출력 형식도 지난번과 같습니다(화면마다 정적 code.html + screen.png, JavaScript로 그리지 않기, style 속성 없이 Tailwind 클래스만, 제목·알림 종 없음).

[A. 가계부 화면과 같은 규격으로 맞추기]
1. 맨 위 3칸 탭(두 화면 모두): 가계부의 지출/수입 전환과 같은 클래스로 바꿔 주세요.
   - 바깥: grid grid-cols-3 p-1 bg-[#F4F3F0] rounded-xl gap-1
   - 선택된 칸: py-2 text-xs font-bold rounded-lg bg-white text-[#1E3A2F] shadow-sm flex items-center justify-center min-h-[44px] whitespace-nowrap
   - 나머지 칸: py-2 text-xs font-semibold rounded-lg text-[#8E928F] hover:text-[#1A1C1A] flex items-center justify-center min-h-[44px] whitespace-nowrap
2. 분류 칩(발견 화면): 가계부 분류 칩과 같은 클래스로 바꿔 주세요. 가로 스크롤은 그대로.
   - 선택: px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1E3A2F] text-white min-h-[36px] flex items-center whitespace-nowrap
   - 나머지: px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FAF9F6] border border-[#E9E8E5] text-[#424844] hover:bg-[#F4F3F0] min-h-[36px] flex items-center whitespace-nowrap
3. 입력칸(자유글 입력, 댓글 입력, 제안 제목, 제안 설명): 가계부 입력칸처럼 bg-white border border-[#E9E8E5] rounded-xl, 포커스는 focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]로 바꿔 주세요.
4. 앱 개선 화면의 안내 상자: 팔레트에 없는 색(#FDE3C8, #824B0E)을 쓰지 말고 배경 #FEF6EC, 테두리 없음, 글자 #424844, 굵은 "더보기 > 버그 제보"만 #1A1C1A로 바꿔 주세요.

[B. 앱에 그대로 옮길 수 있게 구조 고치기]
5. 본문 "더보기"(발견 화면 (다) 카드): 지금은 글을 중간에서 직접 잘라 "..."를 적고 문단 안에 버튼을 넣었습니다. 실제 글 길이는 매번 달라서 이렇게 하면 쓸 수 없습니다.
   - 본문 <p>에 line-clamp-4를 주고 글은 끝까지 다 적어 주세요.
   - "더보기" 버튼은 문단 밖, 그 아래 줄에 따로 두세요: text-xs font-semibold text-[#1E3A2F] (밑줄 없음).
6. 대장간 카드의 좋아요: "👍 멋져요 45"를 한 덩어리로 쓰지 말고 <span>👍 멋져요</span><span>45</span>처럼 글자와 숫자를 나눠 주세요.
7. 댓글의 칭호 배지(예: "문장 수집가")에 쓰인 py-0.2는 없는 클래스입니다. 게시물 작성자 줄의 칭호 배지와 똑같은 클래스(px-1.5 py-0.5 rounded-md text-[10px] font-semibold … whitespace-nowrap)로 맞춰 주세요.
8. 종류 배지 색을 이렇게 고정해 주세요(배지 모양은 지금 그대로):
   - 기록: bg-[#EDF3F8] text-[#4E70A0] / 일기: bg-[#EBF7F0] text-[#1E3A2F] / 독서록: bg-[#FEF6EC] text-[#C97A1E] / 자유글: bg-[#F4F3F0] text-[#424844] / 대장간: bg-[#FDF0EE] text-[#B45650]
   - 지금 화면에는 일기 카드가 없으니, (가) 카드를 "기록" 대신 "일기"로 바꾸지 말고, (가)는 그대로 두세요. 일기 색은 위 규칙만 지키면 됩니다.

[C. 사용자 입장에서 작은 개선]
9. "내 글" 표시: 내 글인 (다) 카드의 이름 줄에, 칭호 배지 다음에 작은 회색 배지 "내 글"(px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F4F3F0] text-[#8E928F] whitespace-nowrap)을 넣어 주세요. 팔로우 버튼이 왜 없는지 바로 알 수 있게.
10. 답글 대상 표시: (나) 카드 댓글 입력 줄 바로 위에, 답글을 쓰는 중일 때만 보이는 작은 줄을 넣어 주세요: 왼쪽 "송은우님에게 답글 남기는 중"(text-[11px] text-[#424844]), 오른쪽 "취소" 글자 버튼(text-[11px] font-semibold text-[#8E928F]). 입력칸 placeholder는 "송은우님에게 답글 남기기"로.
11. 글자 수: "최대 6000자", "최대 120자", "최대 3000자" 같은 고정 문구를 "0 / 6000", "0 / 120", "0 / 3000" 형식으로 바꿔 주세요(앱에서 입력할 때마다 숫자를 바꿉니다). 위치와 글자 모양은 지금 그대로.
12. 사진이 많을 때 모양: (가) 카드의 사진을 5장으로 바꾸고, 2×2 격자(grid grid-cols-2 gap-1.5)로 4칸만 보여 주세요. 네 번째 칸 위에 반투명 어두운 덮개와 흰 글자 "+1"을 겹쳐 주세요. 사진 칸은 지금처럼 회색 상자, 모서리와 간격도 지금 그대로.
13. 앱 개선 화면에 짧은 예시 카드 2장을 목록 끝에 추가해 주세요. 상태 배지 "검토 후 계획"(bg-[#EDF3F8] text-[#4E70A0])과 "보류"(bg-[#F4F3F0] text-[#8E928F])가 각각 하나씩 보이도록. 카드 모양은 기존 제안 카드와 똑같이.

---
