/* =============================================================================
 * scenes.js — 장면 "데이터" 정의 (순서/타입/문구/에셋)
 * -----------------------------------------------------------------------------
 * 장면 순서를 바꾸거나 추가/삭제하려면 이 배열만 수정하세요.
 * STEP 번호는 게이트(STEP 1) 다음부터 자동 계산됩니다. (현재 총 10 STEP)
 *
 * type 종류:
 *   'reaction' : 아이 반응 (mood: 'happy' | 'sad' | 'neutral'), sparkle 반짝임
 *   'drag'     : 도구를 아이 몸으로 드래그 (action: 'foam' | 'rinse')
 *                - gauge: 'rise'(0→100) | 'hold'(고정 100) | 'fall'(100→0)
 *                - surfactant: 계면이 표시(rinse면 씻겨나감) / weaken: 문지르면 약해짐
 *                - requireGaugeZero: 게이지 0% 확인 후에만 완료
 *                - point: POINT! 안내 박스 문구
 *   'warning'  : 민감도 100% 경고 연출 (게이지 100% + 경고등 + 울상)
 *   'closeup'  : 피부 클로즈업 (skin: 'irritated'), surfactant: 계면이 노출
 *   'brand'    : 이슬로 제품 + 핵심 키워드
 *   'ending'   : 깨끗한 피부 + 이슬로 베이비 3종 + 다시하기 (성공 연출 통합)
 *   (보존: 'mission' | 'message' | 'success' — 현재 흐름 미사용)
 * ========================================================================== */
(function () {
  'use strict';
  var T = window.ESLO_CONFIG.texts;

  window.ESLO_SCENES = [
    // STEP 2 — 오프닝
    { id: 'opening', type: 'reaction', title: T.scenes.opening, mood: 'happy' },

    // STEP 3 — 일반 바디워시 사용 (게이지 0→100)
    { id: 'bodywashUse', type: 'drag', title: T.scenes.bodywashUse,
      tool: 'bodywash', action: 'foam', hint: T.hints.dragWash, gauge: 'rise' },

    // STEP 4 — 민감도 100% 경고
    { id: 'warning', type: 'warning', title: T.scenes.warning },

    // STEP 5 — 왜 그런지 살펴보기 (울상)
    { id: 'distress', type: 'reaction', title: T.scenes.distress, mood: 'sad' },

    // STEP 6 — 나쁜 계면활성제 확인 (피부 클로즈업)
    { id: 'residue', type: 'closeup', title: T.scenes.residue,
      skin: 'irritated', surfactant: true },

    // STEP 7 — 이슬로는 달라요 (제품 + 키워드)
    { id: 'transition', type: 'brand', title: T.scenes.transition,
      keywords: T.esloKeywords },

    // STEP 8 — 이슬로 바디 제품 사용 (계면이 붙은 채 시작, 게이지 100% 유지)
    { id: 'esloUse', type: 'drag', title: T.scenes.esloUse,
      tool: 'eslo', action: 'foam', hint: T.hints.dragWashEslo,
      gauge: 'hold', surfactant: true, weaken: true, point: T.scenes.point },

    // STEP 9 — 샤워기로 헹구기 (계면이 씻김 + 게이지 100→0)
    { id: 'esloRinse', type: 'drag', title: T.scenes.esloRinse,
      tool: 'shower', action: 'rinse', hint: T.hints.dragRinse,
      gauge: 'fall', surfactant: true, requireGaugeZero: true },

    // STEP 10 — 깨끗해진 피부 + 이슬로 베이비 3종 엔딩 (성공 연출 통합)
    { id: 'ending', type: 'ending', title: T.scenes.ending, sub: T.scenes.endingSub },
  ];
})();
