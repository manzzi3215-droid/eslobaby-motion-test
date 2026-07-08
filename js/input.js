/* =============================================================================
 * input.js — 입력(Input) 드라이버 레지스트리 (v0.5.0-motion-test, Phase 0)
 * -----------------------------------------------------------------------------
 * "장면 진행도(0~1)를 무엇이 만들어내는가"를 추상화한다.
 *   - InputDriver 는 (ctx) => cleanup 형태의 팩토리.
 *   - game.js 의 renderDrag 는 Input.createDriver(ctx) 만 호출하고,
 *     진행도가 어떻게 만들어지는지는 알 필요가 없다.
 *
 * Phase 0 에서는 'pointer'(터치/마우스 드래그) 하나만 등록한다.
 * 기존 동작과 100% 동일하도록, PointerDriver 는 interactions.js 의
 * makeRubbable() 을 그대로 호출하며 튜닝값만 options 로 전달한다.
 *
 * 후속(Phase 1~): Input.register('motion', ...) 로 형제 드라이버를 추가하면
 *   renderDrag 코드 변경 없이 입력 방식이 확장된다.
 *
 * === InputDriver 계약 =========================================================
 *   ctx = {
 *     scene,      // 현재 장면 데이터 (읽기 전용). scene.inputMode 로 장면별 override 가능
 *     tool, body, stage,   // DOM 요소
 *     onProgress, // (r: 0~1) => void  — 여러 번 호출 가능
 *     onComplete, // () => void        — 정확히 1회
 *     options,    // createDriver 가 config.input 을 병합해 주입
 *   }
 *   반환: cleanup: () => void   // 멱등, 모든 리소스(리스너/타이머/카메라/RAF) 해제
 * ========================================================================== */
(function () {
  'use strict';

  // config.input 에서 공통값 + mode 별 값을 병합해 드라이버에 넘길 options 생성.
  // config.input 이 없으면 빈 값을 넘기고, 각 드라이버가 자체 기본값으로 폴백한다.
  function mergeOptions(cfg, mode) {
    var modeOpts = (cfg && cfg[mode]) || {};
    return {
      // 공통 (드라이버 종류와 무관)
      completeThreshold: cfg ? cfg.completeThreshold : undefined,
      fallbackMs:        cfg ? cfg.fallbackMs        : undefined,
      // mode 별 (예: pointer.targetDistance)
      targetDistance:    modeOpts.targetDistance,
      // mode 전용 세부값은 통째로도 전달 (후속 드라이버가 자유롭게 사용)
      mode:              modeOpts,
    };
  }

  var Input = {
    _drivers: {},

    // 드라이버 등록: factory(ctx) => cleanup
    register: function (mode, factory) {
      this._drivers[mode] = factory;
    },

    // 현재 장면에 맞는 드라이버를 생성. 어떤 이유로든 실패하면 pointer 로 폴백.
    createDriver: function (ctx) {
      var cfg  = (window.ESLO_CONFIG && window.ESLO_CONFIG.input) || null;
      var mode = (ctx.scene && ctx.scene.inputMode) || (cfg && cfg.mode) || 'pointer';
      var factory = this._drivers[mode] || this._drivers.pointer;
      var merged  = mergeOptions(cfg, mode);
      var fullCtx = assign({}, ctx, { options: merged });
      try {
        return factory(fullCtx);
      } catch (e) {
        // 드라이버 생성 실패 시 게임이 멈추지 않도록 pointer 로 안전 폴백
        try { if (window.Analytics) window.Analytics.logError('input driver "' + mode + '": ' + e); } catch (_) {}
        return this._drivers.pointer(fullCtx);
      }
    },
  };

  // Object.assign 얕은 복사 (구형 대비 최소 폴리필 — 현재 타겟은 지원하나 방어적으로)
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  /* ---------- PointerDriver 등록 (Phase 0 기본) ----------------------
   * 기존 makeRubbable() 을 그대로 사용 → 드래그 감각/판정/타이밍 100% 동일.
   * options(targetDistance/completeThreshold/fallbackMs)만 전달하며,
   * 값이 비어 있으면 makeRubbable 내부 기존 기본값이 그대로 쓰인다.
   * ------------------------------------------------------------------- */
  Input.register('pointer', function (ctx) {
    return window.Interactions.makeRubbable({
      tool: ctx.tool, body: ctx.body, stage: ctx.stage,
      onProgress: ctx.onProgress,
      onComplete: ctx.onComplete,
      options: ctx.options,
    });
  });

  window.Input = Input;
})();
