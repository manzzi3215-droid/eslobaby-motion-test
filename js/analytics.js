/* =============================================================================
 * analytics.js — 플레이 통계 수집 (v0.4.0-beta, 관리자 대시보드용)
 * -----------------------------------------------------------------------------
 * - 기본 저장소는 LocalStorage. Firebase 미사용 시에도 정상 동작.
 * - 추후 Firebase 연동을 위해 save() 안에서 sync() 훅을 호출하는 구조로 작성.
 *   (config.admin.firebase 가 채워지면 확장; 지금은 no-op)
 * - 게임 로직에는 영향을 주지 않으며, 실패해도 게임이 멈추지 않도록 전부 try/catch.
 *
 * 수집 항목: 플레이 수(오늘/전체)·완료 수/완료율·평균 플레이 시간·STEP 퍼널·
 *            화면별 평균 체류시간·기기(OS) 분포·최근 오류 로그.
 * ========================================================================== */
(function () {
  'use strict';

  var KEY = 'eslo_admin_v1';
  var MAX_ERRORS = 30;

  var session = null;      // 진행 중인 플레이 세션 (메모리)
  var lastSceneId = 'gate';

  function now() { return Date.now(); }
  function today() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function defaults() {
    return {
      totalPlays: 0,
      completes: 0,
      completeTimeMs: 0,           // 완료 세션들의 누적 플레이 시간
      playsByDate: {},             // { 'YYYY-MM-DD': count }
      funnel: { start: 0, step1: 0, step2: 0, step3: 0, complete: 0 },
      dwell: {},                   // { sceneId: { totalMs, count } }
      devices: {},                 // { 'iPhone'|'Android'|'기타': count }
      errors: [],                  // [{ t, screen, msg, ua }]
      updatedAt: 0,
    };
  }

  var data = defaults();

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        // 기본 구조와 병합 (구버전/누락 필드 방어)
        var d = defaults();
        for (var k in parsed) if (parsed.hasOwnProperty(k)) d[k] = parsed[k];
        d.funnel = Object.assign({ start: 0, step1: 0, step2: 0, step3: 0, complete: 0 }, parsed.funnel || {});
        data = d;
      }
    } catch (e) { /* LocalStorage 불가(프라이빗 모드 등) — 메모리로만 동작 */ }
  }

  function save() {
    data.updatedAt = now();
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    sync();   // Firebase 등 외부 저장소 훅 (지금은 no-op)
  }

  // 추후 Firebase 연동 지점 — config.admin.firebase 가 설정되면 여기서 push.
  function sync() {
    try {
      var cfg = window.ESLO_CONFIG && window.ESLO_CONFIG.admin;
      if (!cfg || !cfg.firebase) return;   // 미설정 시 LocalStorage 전용
      // TODO(firebase): cfg.firebase 초기화 후 data 를 문서에 저장.
      //   예) firebase.firestore().collection('eslo_stats').doc('summary').set(data)
    } catch (e) {}
  }

  function detectDevice() {
    var ua = (navigator.userAgent || '');
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone';
    if (/Android/i.test(ua)) return 'Android';
    return '기타';
  }

  function inc(obj, key) { obj[key] = (obj[key] || 0) + 1; }

  /* ---------- 세션 훅 (game.js 에서 호출) ---------------------------- */
  function startSession() {
    endSession();                    // 이전 세션이 남아있으면 정리
    session = { start: now(), reached: { start: true }, completed: false, current: null };
    inc(data, 'totalPlays');
    inc(data.playsByDate, today());
    inc(data.funnel, 'start');
    inc(data.devices, detectDevice());
    save();
  }

  function closeDwell() {
    if (session && session.current) {
      var id = session.current.id;
      if (!data.dwell[id]) data.dwell[id] = { totalMs: 0, count: 0 };
      data.dwell[id].totalMs += Math.max(0, now() - session.current.start);
      data.dwell[id].count += 1;
      session.current = null;
    }
  }

  function enterScene(sceneId, phase) {
    lastSceneId = sceneId;
    if (!session) return;            // 정식 플레이(세션) 중에만 집계
    closeDwell();
    session.current = { id: sceneId, start: now() };

    if (phase >= 1 && !session.reached.step1) { session.reached.step1 = true; inc(data.funnel, 'step1'); }
    if (phase >= 2 && !session.reached.step2) { session.reached.step2 = true; inc(data.funnel, 'step2'); }
    if (phase >= 3 && !session.reached.step3) { session.reached.step3 = true; inc(data.funnel, 'step3'); }

    if (sceneId === 'missionSuccess' && !session.completed) {
      session.completed = true;
      inc(data.funnel, 'complete');
      inc(data, 'completes');
      data.completeTimeMs += Math.max(0, now() - session.start);
    }
    save();
  }

  function endSession() {
    if (!session) return;
    closeDwell();
    session = null;
    save();
  }

  function logError(msg) {
    try {
      data.errors.unshift({
        t: new Date().toISOString(),
        screen: (session && session.current) ? session.current.id : lastSceneId,
        msg: String(msg || '알 수 없는 오류').slice(0, 300),
        ua: detectDevice() + ' · ' + (navigator.userAgent || '').slice(0, 90),
      });
      if (data.errors.length > MAX_ERRORS) data.errors.length = MAX_ERRORS;
      save();
    } catch (e) {}
  }

  /* ---------- 조회/초기화 (admin.js 에서 사용) ---------------------- */
  function getStats() {
    // 깊은 복사로 반환 (대시보드가 원본을 변형하지 않도록)
    try { return JSON.parse(JSON.stringify({
      todayPlays: data.playsByDate[today()] || 0,
      totalPlays: data.totalPlays,
      completes: data.completes,
      completeRate: data.totalPlays ? data.completes / data.totalPlays : 0,
      avgPlayMs: data.completes ? Math.round(data.completeTimeMs / data.completes) : 0,
      funnel: data.funnel,
      dwell: data.dwell,
      devices: data.devices,
      errors: data.errors,
      storage: storageMode(),
      updatedAt: data.updatedAt,
    })); } catch (e) { return null; }
  }

  function storageMode() {
    var cfg = window.ESLO_CONFIG && window.ESLO_CONFIG.admin;
    if (cfg && cfg.firebase) return 'Firebase + LocalStorage';
    try { window.localStorage.setItem('__t', '1'); window.localStorage.removeItem('__t'); return 'LocalStorage'; }
    catch (e) { return '메모리(저장 불가)'; }
  }

  function reset() {
    data = defaults();
    save();
  }

  /* ---------- 초기화 (오류 캡처) ------------------------------------ */
  function init() {
    load();
    try {
      window.addEventListener('error', function (e) {
        logError((e && e.message) ? e.message : 'error');
      });
      window.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason;
        logError('Promise: ' + ((r && r.message) ? r.message : r));
      });
    } catch (e) {}
  }
  init();

  window.Analytics = {
    startSession: startSession,
    enterScene: enterScene,
    endSession: endSession,
    logError: logError,
    getStats: getStats,
    reset: reset,
  };
})();
