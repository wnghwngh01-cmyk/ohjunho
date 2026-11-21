# Stitch 수정 프롬프트: 운동 상태 모음 1차 (2026-11-21)

2차 결과 검토: 운동 관리(_27)·단백질 기록(_28)은 1차 지적 8개가 모두 반영됨(운동 삭제 summary 밖, 메모 이름표, 두 줄 요약 + truncate, 바깥 여백, aria-label).
상태 모음(_29)은 상태 5개와 문구는 맞지만 거의 모든 부분을 새 클래스로 다시 그림(날짜 줄·추가 줄 카드 없음, g 단위 없음, 목록 줄 작음, 세트 입력칸 회색, onsubmit 인라인 처리 등).
그래서 확정 화면 2장의 클래스를 그대로 적어 보낸다.

---

"운동 - 상태 모음" 화면만 고쳐 주세요. "운동 - 운동 관리", "운동 - 단백질 기록"과 다른 모든 화면은 절대 건드리지 마세요. 상태 5개의 내용과 문구는 그대로 두고, 모양만 확정 화면 2장과 **똑같은 클래스**로 바꿔 주세요. 출력 형식은 지난번과 같습니다.
1. 바깥: class="max-w-[480px] mx-auto px-4 pt-4 pb-[96px] space-y-3". 상태 제목(①~⑤)은 지금 모양 그대로.
2. 부위 카드: details class="group/part bg-white rounded-2xl border border-[#F0EFEA] shadow-subtle p-4 space-y-4", summary class="flex items-center justify-between cursor-pointer min-h-[44px] select-none gap-2", 이름 class="text-base font-bold text-[#1A1C1A] truncate", "운동 0개" class="text-xs text-[#8E928F] font-normal shrink-0". 펼친 내용은 class="space-y-3 pt-1 border-t border-[#F0EFEA]".
3. ② "아직 운동이 없습니다…" 문구: class="py-6 text-center text-xs text-[#8E928F]" 한 줄(회색 상자 없이). 운동 추가 줄은 운동 관리 화면과 같게(입력 class="flex-1 min-h-[44px] px-3.5 text-xs bg-[#FAF9F6] border border-[#E9E8E5] rounded-xl …", "추가" class="min-h-[44px] px-4 text-xs font-semibold rounded-xl bg-[#FAF9F6] border border-[#E9E8E5] text-[#1E3A2F] …").
4. ③은 운동 관리 화면처럼 부위 카드("어깨") 안의 운동 details로 그려 주세요: details class="group/ex bg-[#FAF9F6] border border-[#F0EFEA] rounded-xl p-3.5 space-y-3.5". 세트 표·입력칸은 class="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center"와 입력 class="w-full min-h-[46px] text-center text-base font-bold text-[#1A1C1A] tabular-nums bg-white border border-[#E9E8E5] rounded-xl …"(흰 바탕). 세트 추가·메모·기록 저장(min-h-[48px] text-sm font-bold)·이전 기록 summary("이전 기록" text-xs font-semibold text-[#1E3A2F])·운동 삭제도 운동 관리 화면과 같은 클래스.
5. ③ "저장된 이전 기록이 없습니다."는 이전 기록 상자 class="mt-2 p-3 bg-white rounded-xl border border-[#F0EFEA]" 안에 class="text-center text-xs text-[#8E928F] py-2"로.
6. ④ 날짜 줄은 흰 카드로: class="flex items-center justify-between bg-white rounded-2xl border border-[#F0EFEA] shadow-subtle px-2 py-1", 날짜 버튼 class="min-h-[44px] px-3 flex items-center justify-center gap-1.5 text-sm font-bold text-[#1A1C1A] rounded-xl", 화살표 버튼 aria-label "전날"/"다음 날".
7. ④ 합계 카드: 이름표 class="text-xs font-medium text-[#8E928F]", 숫자 class="text-3xl font-extrabold text-[#1E3A2F] tabular-nums tracking-tight", g class="text-lg font-bold text-[#424844]".
8. ④ 추가 줄은 단백질 기록 화면과 똑같이: 흰 카드 class="bg-white rounded-2xl border border-[#F0EFEA] shadow-subtle p-3" 안에, 단백질 칸은 div class="relative w-24" + input placeholder "0" + 오른쪽 "g" 글자(span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8E928F] pointer-events-none"). form과 onsubmit은 쓰지 마세요(div로).
9. ④ 빈 목록 카드: class="bg-white rounded-2xl border border-[#F0EFEA] shadow-subtle p-4 py-10 text-center", 문구 class="text-xs text-[#8E928F]".
10. ⑤ 목록은 단백질 기록 화면과 똑같이: 카드 class="bg-white rounded-2xl border border-[#F0EFEA] shadow-subtle p-4 space-y-1", 머리 "섭취 내역 (2건)" class="text-[11px] font-semibold text-[#8E928F] px-1 mb-2", 줄 class="flex items-center justify-between py-2.5 px-1 border-b border-[#F0EFEA] min-h-[44px] gap-2"(마지막 줄은 border 없이), 이름 class="text-sm font-semibold text-[#1A1C1A] truncate", 그램 class="text-sm font-bold text-[#1E3A2F] tabular-nums", 삭제 class="min-h-[44px] px-1.5 text-xs font-medium text-[#B45650] hover:text-[#933D37] flex items-center whitespace-nowrap".
---
