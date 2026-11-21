# Stitch 수정 프롬프트: 광장 상태 모음 1차 (2026-11-20)

상태 모음(_24) 검토: 요청 상태 8개 모두 있음, 확정 화면 2장은 바이트 단위로 그대로. 다만 "발견 화면 클래스 그대로 복사" 지시와 달리 일부 모양이 다름:
프로필(w-10 h-10 border-white), 종류 배지(rounded text-[11px]), 댓글 입력·등록(min-h-[38px]), "···" 메뉴(border-[#E9E8E5] shadow-lg z-10), 증명서 자리(h-40 border-[#E9E8E5]), 카드 그림자(shadow-[...] 대신 shadow-subtle).

---

"광장 - 상태 모음" 화면만 고쳐 주세요. "광장 (발견)", "광장 (앱 개선)"은 절대 건드리지 마세요. 상태 8개의 내용과 문구는 지금 그대로 두고, 모양만 "광장 (발견)" 화면과 **똑같은 클래스**로 바꿔 주세요. 출력 형식은 지난번과 같습니다.
1. 게시물 카드 겉: class="bg-white rounded-2xl border border-[#F0EFEA] shadow-subtle p-4 space-y-3" (빈 상태 카드 ⑤~⑧도 같은 겉모양에 안쪽만 가운데 정렬 py-10)
2. 작성자 프로필: <div class="p-0.5 rounded-full border border-[#C3ECD6]"><div class="w-9 h-9 rounded-full bg-[#E8F1EC] text-[#1E3A2F] text-xs font-bold flex items-center justify-center">윤</div></div> (w-10, border-white, shadow-sm 쓰지 않기)
3. 작성자 이름: class="text-xs font-bold text-[#1A1C1A]" (hover:underline, cursor-pointer 빼기)
4. 종류 배지: class="px-2 py-0.5 rounded-md text-[10.5px] font-semibold … whitespace-nowrap" (색만 종류별: 일기 bg-[#EBF7F0] text-[#1E3A2F], 기록 bg-[#EDF3F8] text-[#4E70A0], 대장간 bg-[#FDF0EE] text-[#B45650])
5. 사진 칸: 격자 class="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden", 칸 class="aspect-square bg-[#EAE8E3] flex items-center justify-center text-[10px] text-[#8E928F]". 사진 1장은 칸만 aspect-[4/3]로 하고 같은 배경·글자, 바깥에 rounded-xl overflow-hidden.
6. 댓글 입력칸: class="flex-1 min-h-[44px] px-3 text-xs bg-white border border-[#E9E8E5] rounded-xl text-[#1A1C1A] placeholder-[#8E928F] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]" / 등록 버튼: class="min-h-[44px] px-3.5 text-xs font-semibold rounded-xl bg-[#1E3A2F] active:bg-[#162C23] text-white flex items-center justify-center whitespace-nowrap"
7. "···" 메뉴 판: class="absolute right-0 bottom-full mb-1 w-24 bg-white rounded-xl border border-[#F0EFEA] shadow-md py-1 z-20"
8. 대장간 증명서 자리: class="h-[160px] rounded-xl border-2 border-dashed border-[#F0EFEA] bg-[#FAF9F6] flex items-center justify-center"

---
