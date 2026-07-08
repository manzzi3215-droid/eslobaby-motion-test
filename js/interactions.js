/* =============================================================================
 * interactions.js — 드래그/터치(문지르기) 인터랙션 모듈
 * -----------------------------------------------------------------------------
 * Pointer Events 사용 → 마우스 / 터치 / 펜을 하나의 코드로 처리.
 * makeRubbable(): 도구를 아이 몸 위에서 문지르면 진행도가 쌓이고,
 *                 목표 도달 시 onComplete 호출.
 * ========================================================================== */
(function () {
  'use strict';
  var CFG = window.ESLO_CONFIG;

  /**
   * @param {Object} p
   *   @param {HTMLElement} p.tool      드래그하는 도구 요소
   *   @param {HTMLElement} p.body      드롭 대상(아이 몸)
   *   @param {HTMLElement} p.stage     좌표 기준이 되는 무대
   *   @param {Function}    p.onProgress(ratio 0~1)
   *   @param {Function}    p.onComplete()
   *   @param {Object}      [p.options]  — Input 드라이버가 주입하는 튜닝값(선택).
   *                        값이 없으면 아래 기존 기본값을 그대로 사용 → 동작 불변.
   *                        { completeThreshold, fallbackMs, targetDistance }
   * @returns {Function} cleanup()  — 장면 전환 시 리스너 해제용
   */
  function makeRubbable(p) {
    var dragging = false;
    var progress = 0;
    var completed = false;
    var lastX = null, lastY = null;
    // v0.5.0 Phase 0: 값 출처만 options 로 확장. 미지정 시 기존 기본값과 동일.
    var opt = p.options || {};
    var threshold = opt.completeThreshold != null ? opt.completeThreshold : CFG.options.dragThreshold;

    // 문지른 거리를 진행도로 환산할 때 기준이 되는 총 거리(px)
    var TARGET_DISTANCE = opt.targetDistance != null ? opt.targetDistance : 900;

    function stageRect() { return p.stage.getBoundingClientRect(); }

    function moveToolTo(clientX, clientY) {
      var r = stageRect();
      var x = clientX - r.left;
      var y = clientY - r.top;
      p.tool.style.left = x + 'px';
      p.tool.style.top = y + 'px';
      p.tool.style.transform = 'translate(-50%, -50%)';
    }

    function isOverBody(clientX, clientY) {
      var b = p.body.getBoundingClientRect();
      return clientX >= b.left && clientX <= b.right &&
             clientY >= b.top  && clientY <= b.bottom;
    }

    function addProgress(dist) {
      if (completed) return;
      progress = Math.min(1, progress + dist / TARGET_DISTANCE);
      p.onProgress(progress);
      if (progress >= threshold) complete();
    }

    function complete() {
      if (completed) return;
      completed = true;
      p.onProgress(1);
      p.onComplete();
    }

    function onDown(e) {
      dragging = true;
      p.tool.setPointerCapture && p.tool.setPointerCapture(e.pointerId);
      lastX = e.clientX; lastY = e.clientY;
      moveToolTo(e.clientX, e.clientY);
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      moveToolTo(e.clientX, e.clientY);
      if (isOverBody(e.clientX, e.clientY) && lastX !== null) {
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        addProgress(Math.sqrt(dx * dx + dy * dy));
      }
      lastX = e.clientX; lastY = e.clientY;
      e.preventDefault();
    }

    function onUp(e) {
      dragging = false;
      lastX = lastY = null;
      if (e && e.pointerId != null && p.tool.releasePointerCapture) {
        try { p.tool.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    }

    p.tool.addEventListener('pointerdown', onDown);
    p.tool.addEventListener('pointermove', onMove);
    p.tool.addEventListener('pointerup', onUp);
    p.tool.addEventListener('pointercancel', onUp);

    // 현장 안전장치: 일정 시간 조작이 없어도 자동 완료
    var fallbackMs = opt.fallbackMs != null ? opt.fallbackMs : CFG.timings.dragFallback;
    var fallback = setTimeout(complete, fallbackMs);

    return function cleanup() {
      clearTimeout(fallback);
      p.tool.removeEventListener('pointerdown', onDown);
      p.tool.removeEventListener('pointermove', onMove);
      p.tool.removeEventListener('pointerup', onUp);
      p.tool.removeEventListener('pointercancel', onUp);
    };
  }

  window.Interactions = { makeRubbable: makeRubbable };
})();
