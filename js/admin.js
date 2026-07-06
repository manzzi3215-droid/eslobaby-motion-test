/* =============================================================================
 * admin.js — 관리자(Admin) 대시보드 (v0.4.0-beta)
 * -----------------------------------------------------------------------------
 * 우측 하단 톱니바퀴 → 비밀번호 로그인 → 대시보드(통계/퍼널/체류시간/기기/오류).
 * 일반 사용자에게는 통계가 노출되지 않고, 게임 로직/디자인과 분리되어 동작.
 * 데이터는 window.Analytics (LocalStorage, Firebase 확장 가능)에서 읽어온다.
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.ESLO_CONFIG;
  var ADMIN = (CFG && CFG.admin) || {};

  // 장면 id → 대시보드 표시 라벨
  var SCENE_LABEL = {
    missionIntro: 'MISSION',
    bodywashUse:  'STEP1 ① 바디워시',
    bodywashRinse:'STEP1 ② 샤워',
    warning:      '경고',
    residue:      '계면활성제 설명',
    esloIntro:    '이슬로 소개',
    esloUse:      'STEP2 이슬로',
    esloRinse:    'STEP3 샤워',
    missionSuccess: 'MISSION 성공',
    brandFinal:   '결과(브랜드)',
  };
  // 체류시간 표시 순서
  var SCENE_ORDER = ['missionIntro','bodywashUse','bodywashRinse','warning','residue',
                     'esloIntro','esloUse','esloRinse','missionSuccess','brandFinal'];

  var gearBtn, overlay;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function div(cls, text) { return el('div', cls, text); }

  function fmtMs(ms) {
    if (!ms) return '–';
    var s = Math.round(ms / 1000);
    if (s < 60) return s + '초';
    var m = Math.floor(s / 60);
    return m + '분 ' + (s % 60) + '초';
  }
  function pct(n) { return Math.round((n || 0) * 100) + '%'; }

  /* ---------- 톱니바퀴 진입 버튼 ---------------------------------- */
  function buildGear() {
    gearBtn = el('button', 'admin-gear');
    gearBtn.setAttribute('aria-label', '설정');
    gearBtn.title = '설정';
    gearBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<path fill="currentColor" d="M19.14 12.94a7.5 7.5 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.3 7.3 0 00-1.62-.94l-.36-2.54a.5.5 0 00-.5-.42h-3.84a.5.5 0 00-.5.42l-.36 2.54c-.58.24-1.12.56-1.62.94l-2.39-.96a.5.5 0 00-.6.22L2.71 8.84a.5.5 0 00.12.64l2.03 1.58a7.5 7.5 0 000 1.88l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32a.5.5 0 00.6.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54a.5.5 0 00.5.42h3.84a.5.5 0 00.5-.42l.36-2.54c.58-.24 1.12-.56 1.62-.94l2.39.96a.5.5 0 00.6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z"/>' +
      '</svg>';
    gearBtn.addEventListener('click', openLogin);
    return gearBtn;
  }

  /* ---------- 오버레이 (로그인 / 대시보드 공용) -------------------- */
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = div('admin-overlay');
    overlay.style.display = 'none';
    // 배경 클릭 시 닫기 (내부 패널 클릭은 유지)
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.getElementById('app').appendChild(overlay);
    return overlay;
  }

  function openLogin() {
    try { if (window.Game && window.Game.pause) window.Game.pause(); } catch (e) {}
    ensureOverlay();
    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    var card = div('admin-login');
    card.addEventListener('click', function (e) { e.stopPropagation(); });

    card.appendChild(div('admin-login-title', '관리자 로그인'));
    card.appendChild(div('admin-login-desc', '비밀번호를 입력하세요'));

    var input = el('input', 'admin-input');
    input.type = 'password';
    input.setAttribute('inputmode', 'text');
    input.setAttribute('autocomplete', 'off');
    input.placeholder = '비밀번호';

    var err = div('admin-login-err');
    err.style.visibility = 'hidden';
    err.textContent = '비밀번호가 올바르지 않습니다.';

    var btn = el('button', 'admin-btn admin-btn-primary', '입장');
    function tryLogin() {
      if (input.value === (ADMIN.password || '')) {
        openDashboard();
      } else {
        err.style.visibility = 'visible';
        input.value = '';
        input.focus();
      }
    }
    btn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryLogin(); });

    var cancel = el('button', 'admin-btn admin-btn-ghost', '닫기');
    cancel.addEventListener('click', close);

    var row = div('admin-login-actions');
    row.appendChild(cancel);
    row.appendChild(btn);

    card.appendChild(input);
    card.appendChild(err);
    card.appendChild(row);
    overlay.appendChild(card);
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
  }

  /* ---------- 대시보드 ------------------------------------------- */
  function statCard(label, value, sub) {
    var c = div('admin-stat');
    c.appendChild(div('admin-stat-val', value));
    c.appendChild(div('admin-stat-label', label));
    if (sub) c.appendChild(div('admin-stat-sub', sub));
    return c;
  }

  function barRow(label, count, max, extra) {
    var r = div('admin-bar-row');
    var head = div('admin-bar-head');
    head.appendChild(el('span', 'admin-bar-label', label));
    head.appendChild(el('span', 'admin-bar-count', count + (extra ? ' · ' + extra : '')));
    r.appendChild(head);
    var track = div('admin-bar-track');
    var fill = div('admin-bar-fill');
    fill.style.width = (max > 0 ? Math.round((count / max) * 100) : 0) + '%';
    track.appendChild(fill);
    r.appendChild(track);
    return r;
  }

  function section(titleText) {
    var s = div('admin-section');
    s.appendChild(div('admin-section-title', titleText));
    return s;
  }

  function openDashboard() {
    ensureOverlay();
    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    var panel = div('admin-panel');
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    var st = (window.Analytics && window.Analytics.getStats()) || null;

    // 헤더
    var header = div('admin-header');
    header.appendChild(div('admin-title', ADMIN.title || '관리자 대시보드'));
    var closeBtn = el('button', 'admin-close', '✕');
    closeBtn.setAttribute('aria-label', '닫기');
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var body = div('admin-body');

    if (!st) {
      body.appendChild(div('admin-empty', '통계를 불러올 수 없습니다.'));
    } else {
      // 1) 플레이 통계 카드
      var stats = div('admin-stats-grid');
      stats.appendChild(statCard('오늘 플레이', String(st.todayPlays)));
      stats.appendChild(statCard('전체 플레이', String(st.totalPlays)));
      stats.appendChild(statCard('완료 수', String(st.completes)));
      stats.appendChild(statCard('완료율', pct(st.completeRate)));
      stats.appendChild(statCard('평균 플레이 시간', fmtMs(st.avgPlayMs)));
      body.appendChild(stats);

      // 2) STEP 퍼널
      var fSec = section('STEP 진행 현황 (퍼널)');
      var f = st.funnel || {};
      var maxF = f.start || 1;
      var funnelRows = [
        ['게임 시작', f.start], ['STEP1', f.step1], ['STEP2', f.step2],
        ['STEP3', f.step3], ['완료', f.complete],
      ];
      funnelRows.forEach(function (row) {
        var rate = f.start ? (row[1] || 0) / f.start : 0;
        fSec.appendChild(barRow(row[0], row[1] || 0, maxF, pct(rate)));
      });
      body.appendChild(fSec);

      // 3) 화면별 평균 체류시간
      var dSec = section('화면별 평균 체류시간');
      var dwell = st.dwell || {};
      var hasDwell = false;
      SCENE_ORDER.forEach(function (id) {
        var d = dwell[id];
        if (!d || !d.count) return;
        hasDwell = true;
        var avg = d.totalMs / d.count;
        var row = div('admin-kv');
        row.appendChild(el('span', 'admin-kv-key', SCENE_LABEL[id] || id));
        row.appendChild(el('span', 'admin-kv-val', fmtMs(avg) + '  (' + d.count + '회)'));
        dSec.appendChild(row);
      });
      if (!hasDwell) dSec.appendChild(div('admin-empty', '아직 체류 데이터가 없습니다.'));
      body.appendChild(dSec);

      // 4) 기기(OS) 분포
      var gSec = section('기기 분포');
      var devs = st.devices || {};
      var devKeys = Object.keys(devs);
      var maxD = devKeys.reduce(function (m, k) { return Math.max(m, devs[k]); }, 0);
      if (!devKeys.length) gSec.appendChild(div('admin-empty', '아직 기기 데이터가 없습니다.'));
      ['iPhone', 'Android', '기타'].forEach(function (k) {
        if (devs[k]) gSec.appendChild(barRow(k, devs[k], maxD));
      });
      body.appendChild(gSec);

      // 5) 최근 오류 로그
      var eSec = section('최근 오류 로그');
      var errs = st.errors || [];
      if (!errs.length) {
        eSec.appendChild(div('admin-empty', '최근 오류가 없습니다.'));
      } else {
        errs.slice(0, 10).forEach(function (er) {
          var item = div('admin-err');
          var t = new Date(er.t);
          var when = isNaN(t) ? er.t : (t.getMonth() + 1) + '/' + t.getDate() + ' ' +
                     ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
          item.appendChild(div('admin-err-top', when + ' · ' + (SCENE_LABEL[er.screen] || er.screen || '-')));
          item.appendChild(div('admin-err-msg', er.msg));
          item.appendChild(div('admin-err-ua', er.ua || ''));
          eSec.appendChild(item);
        });
      }
      body.appendChild(eSec);
    }

    panel.appendChild(body);

    // 푸터: 저장 방식 + 새로고침 + 초기화
    var footer = div('admin-footer');
    footer.appendChild(div('admin-foot-info',
      '저장: ' + (st ? st.storage : '–') + ' · ' + (CFG.meta ? CFG.meta.version : '')));
    var refresh = el('button', 'admin-btn admin-btn-ghost', '새로고침');
    refresh.addEventListener('click', openDashboard);
    var resetBtn = el('button', 'admin-btn admin-btn-danger', '통계 초기화');
    resetBtn.addEventListener('click', function () {
      if (window.confirm('모든 통계를 초기화할까요? 되돌릴 수 없습니다.')) {
        if (window.Analytics) window.Analytics.reset();
        openDashboard();
      }
    });
    footer.appendChild(refresh);
    footer.appendChild(resetBtn);
    panel.appendChild(footer);

    overlay.appendChild(panel);
  }

  /* ---------- 초기화 -------------------------------------------- */
  function init() {
    if (ADMIN.gearEnabled === false) return;   // 완전 숨김 옵션
    var app = document.getElementById('app');
    if (!app) return;
    app.appendChild(buildGear());
    ensureOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.Admin = { open: openLogin, close: close };
})();
