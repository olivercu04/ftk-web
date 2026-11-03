// FTK — mã chung của trang. Nạp sau config.js (đọc window.FTK_CONFIG).
// Phần 1 chạy ngay trong <head>: gắn class trước khi trình duyệt vẽ, tránh nháy. Phần 2 chạy khi DOM sẵn sàng.
(function () {
  var root = document.documentElement, reduce;
  root.classList.add('js');
  // Kính lỏng → nền tối đặc trên máy yếu (≤ 2 nhân). Các đường lùi khác (giảm trong suốt, không có backdrop-filter) nằm trong CSS.
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) root.classList.add('kinh-dac');
  reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-motion');
    // an toàn: nếu phần 2 không chạy, bỏ trạng thái ẩn sau 3 s
    setTimeout(function () { if (!window.__ftkReady) root.classList.remove('js-motion'); }, 3000);
  }
})();

(function () {
function init() {
  var root = document.documentElement;
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hoverMq = window.matchMedia('(hover: hover)');
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ───────── Cấu hình (config.js): chữ, link, cờ ─────────
  var C = window.FTK_CONFIG || {};
  function cfg(k) { var v = C[k]; return typeof v === 'string' ? v.trim() : ''; }
  function webUrl(v) { return /^https?:\/\/\S+$/i.test(v) ? v : ''; }
  function mailAddr(v) { return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(v) ? v : ''; }
  function qa(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  qa('[data-cfg]', function (e) {                       // data-cfg="KHOÁ": điền chữ (meta: điền content); trống → giữ chữ có sẵn
    var v = cfg(e.getAttribute('data-cfg'));
    if (!v) return;
    if (e.tagName === 'META') e.setAttribute('content', v + (e.getAttribute('data-cfg-sau') || ''));
    else e.textContent = v + (e.getAttribute('data-cfg-sau') || '');
  });
  var brandA = document.querySelector('.isl-brand');
  if (brandA) brandA.setAttribute('aria-label', (cfg('APP_SHORT') || 'FTK') + ' — lên đầu trang');
  qa('[data-cfg-href]', function (a) {                  // nút "Đăng ký dùng thử": có link → mở link; trống → giữ #lien-he (cuộn mượt / nhảy thẳng theo CSS)
    var u = webUrl(cfg(a.getAttribute('data-cfg-href')));
    if (!u) return;
    a.setAttribute('href', u); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
  });

  // ───────── Cờ SHOW_ANH_APP: phần tạm ẩn nằm trong <template data-an="anh-app"> (ảnh không giải mã / tải) ─────────
  if (C.SHOW_ANH_APP === true) {
    Array.prototype.slice.call(document.querySelectorAll('template[data-an="anh-app"]')).forEach(function (t) {
      t.parentNode.replaceChild(document.importNode(t.content, true), t);
    });
    Array.prototype.slice.call(document.querySelectorAll('a[data-to]')).forEach(function (a) { a.setAttribute('href', '#' + a.getAttribute('data-to')); });
    var heroB = document.querySelector('[data-hero-2]');
    if (heroB) { heroB.textContent = 'Xem thao tác'; heroB.setAttribute('href', '#' + 'thao-tac'); }
  }

  // ───────── Ảnh nội dung: src / alt / chú thích lấy từ FTK_CONFIG.MEDIA (ảnh trong <template> được điền sau khi đưa vào DOM) ─────────
  var MEDIA = C.MEDIA || {};
  qa('img[data-media]', function (img) {
    var m = MEDIA[img.getAttribute('data-media')];
    if (!m || m.kind !== 'anh' || !m.src) return;
    img.alt = m.alt || '';
    var fig = img.closest('figure'), cap = fig && fig.querySelector('figcaption');
    if (cap) { if (m.chu_thich) cap.textContent = m.chu_thich; else cap.remove(); }
    img.src = m.src;
  });

  // ───────── #lien-he: 4 kênh. Trống hết → ẩn danh sách, hiện khối "Sắp mở đăng ký" (HTML mặc định). Có ≥ 1 kênh → ẩn khối đó, chỉ hiện ô của kênh có giá trị ─────────
  var CH = {
    SIGNUP_URL: { text: 'Đăng ký dùng thử' },
    CONTACT_EMAIL: { mail: true },
    ZALO_URL: { text: 'Nhắn qua Zalo' },
    FACEBOOK_URL: { text: 'Trang Facebook' }
  };
  var anyCh = false;
  qa('.lh-item', function (li) {
    var k = li.getAttribute('data-ch'), d = CH[k], val = li.querySelector('.lh-val');
    if (!d || !val) return;
    var ok = d.mail ? mailAddr(cfg(k)) : webUrl(cfg(k));
    if (!ok) { li.hidden = true; return; }
    anyCh = true;
    var a = document.createElement('a');
    a.href = d.mail ? 'mailto:' + ok : ok;
    a.textContent = d.mail ? ok : d.text;
    if (!d.mail) { a.target = '_blank'; a.rel = 'noopener'; }
    val.textContent = ''; val.appendChild(a);
    li.hidden = false;
  });
  var lhList = document.querySelector('#lien-he .lh-list'), lhSoon = document.querySelector('#lien-he .cta-actions'), lhNote = document.getElementById('soon-note');
  if (lhList) lhList.hidden = !anyCh;
  if (lhSoon) lhSoon.hidden = anyCh;
  if (lhNote) lhNote.hidden = anyCh;
  var lhSub = document.querySelector('#lien-he .sub');
  if (lhSub) lhSub.textContent = anyCh ? 'Muốn dùng thử, hỏi thêm hoặc góp ý? Nhắn cho chúng tôi qua một trong các kênh dưới đây.' : 'Kênh liên hệ đang cập nhật.';

  // ───────── Khối "sắp có": cờ SHOW_AI_TEASER (tắt → khối giữ thuộc tính hidden, không có mục menu) ─────────
  var aiSec = document.getElementById('ai-sap-co');
  if (aiSec && C.SHOW_AI_TEASER === true) {
    aiSec.hidden = false;
    var ndA = document.querySelector('#isl-menu a[href="#danh-cho-ai"]'), ndLi = ndA && ndA.parentNode;
    if (ndLi) { var aiLi = document.createElement('li'); aiLi.innerHTML = '<a href="#ai-sap-co">Sắp có</a>'; ndLi.parentNode.insertBefore(aiLi, ndLi.nextSibling); }
  }

  // ───────── Ô video giới thiệu: chỉ tạo khi YOUTUBE_ID có giá trị (trống → không có trong DOM, không request) ─────────
  var ytId = cfg('YOUTUBE_ID'), xtSec = document.getElementById('xem-thu');
  if (xtSec && /^[A-Za-z0-9_-]{6,20}$/.test(ytId)) {
    var vdSec = document.createElement('section');
    vdSec.id = 'video'; vdSec.className = 'section'; vdSec.setAttribute('aria-labelledby', 'vd-title');
    vdSec.innerHTML = '<div class="narrow"><div class="sec-head" data-reveal><h2 id="vd-title" class="h2">Video giới thiệu</h2></div><div class="vd lg" data-reveal></div></div>';
    var vdFr = document.createElement('iframe');
    vdFr.setAttribute('loading', 'lazy');
    vdFr.title = 'Video giới thiệu ' + (cfg('APP_SHORT') || 'FTK');
    vdFr.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    vdFr.setAttribute('allowfullscreen', '');
    vdFr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    vdFr.src = 'https://www.youtube-nocookie.com/embed/' + ytId;
    vdSec.querySelector('.vd').appendChild(vdFr);
    xtSec.parentNode.insertBefore(vdSec, xtSec.nextSibling);
  }

  // ───────── Thiên hà: 2 lớp sao vẽ MỘT lần (vẽ lại chỉ khi cửa sổ đổi cỡ nhiều) ─────────
  var skyFar = document.querySelector('.sky-far'), skyNear = document.querySelector('.sky-near'), skyGrain = document.querySelector('.sky-grain');
  var STAR = ['246,246,255', '246,246,255', '246,246,255', '238,241,255', '204,218,255', '255,232,208', '228,214,255'];
  var skyArea = 0;
  function paint(cv, cw, ch, maxPx, fn) {
    var s = Math.min(window.devicePixelRatio || 1, 2);
    if (cw * ch * s * s > maxPx) s = Math.sqrt(maxPx / (cw * ch));
    cv.width = Math.round(cw * s); cv.height = Math.round(ch * s);
    var g = cv.getContext('2d');
    g.setTransform(s, 0, 0, s, 0, 0);
    fn(g);
  }
  function drawSky() {
    if (!skyFar || !skyFar.getContext) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var cw = vw * 1.16, ch = vh * 1.16, k = (vw * vh) / 1296000;   // mật độ theo diện tích (1440 × 900 = 1)
    skyArea = vw * vh;
    paint(skyFar, cw, ch, 2.4e6, function (g) {
      var R = mulberry(7), i, u, x, y, r, a;
      // bụi sáng của dải Ngân Hà (chéo từ dưới trái lên trên phải), rất mờ
      for (i = 0; i < 26; i++) {
        u = R(); x = u * cw; y = ch * (.84 - .6 * u) + (R() - .5) * .14 * ch; r = (.1 + R() * .16) * Math.max(cw, ch);
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        var c = R() < .5 ? '150,140,255' : (R() < .5 ? '120,160,255' : '210,150,230');
        gr.addColorStop(0, 'rgba(' + c + ',' + (.018 + R() * .02).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      var n = Math.round(Math.max(260, 860 * k));
      for (i = 0; i < n; i++) {
        if (R() < .42) { u = R(); x = u * cw; y = ch * (.84 - .6 * u) + (R() + R() + R() - 1.5) * .17 * ch; }
        else { x = R() * cw; y = R() * ch; }
        r = .32 + Math.pow(R(), 2.2) * .72; a = .2 + Math.pow(R(), 1.6) * .56;
        g.fillStyle = 'rgba(' + STAR[(R() * STAR.length) | 0] + ',' + a.toFixed(3) + ')';
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      }
    });
    paint(skyNear, cw, ch, 1.6e6, function (g) {
      var R = mulberry(11), i, x, y, r, a;
      var n = Math.round(Math.max(70, 180 * k));
      for (i = 0; i < n; i++) {
        x = R() * cw; y = R() * ch; r = .6 + Math.pow(R(), 2) * .95; a = .45 + R() * .5;
        g.fillStyle = 'rgba(' + STAR[(R() * STAR.length) | 0] + ',' + a.toFixed(3) + ')';
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      }
      var nb = Math.max(4, Math.round(9 * Math.sqrt(k)));   // vài ngôi sáng có quầng nhẹ
      for (i = 0; i < nb; i++) {
        x = R() * cw; y = R() * ch; r = 7 + R() * 9;
        var c = STAR[(R() * STAR.length) | 0];
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(' + c + ',.42)'); gr.addColorStop(.25, 'rgba(' + c + ',.12)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        g.strokeStyle = 'rgba(' + c + ',.16)'; g.lineWidth = .6; g.beginPath();
        g.moveTo(x - r * 1.3, y); g.lineTo(x + r * 1.3, y); g.moveTo(x, y - r * 1.3); g.lineTo(x, y + r * 1.3); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(x, y, 1.15 + R() * .6, 0, 6.2832); g.fill();
      }
    });
  }
  drawSky();
  if (skyGrain) {   // hạt phim tĩnh rất nhẹ (ô 128 px lặp lại)
    try {
      var gc = document.createElement('canvas'); gc.width = gc.height = 128;
      var gg = gc.getContext('2d'), im = gg.createImageData(128, 128), GR = mulberry(5);
      for (var gi = 0; gi < im.data.length; gi += 4) { var v = (GR() * 255) | 0; im.data[gi] = im.data[gi + 1] = im.data[gi + 2] = v; im.data[gi + 3] = 255; }
      gg.putImageData(im, 0, 0);
      skyGrain.style.backgroundImage = 'url(' + gc.toDataURL('image/png') + ')';
    } catch (e) {}
  }
  var skyRT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(skyRT);
    skyRT = setTimeout(function () { var r = (window.innerWidth * window.innerHeight) / (skyArea || 1); if (r > 1.3 || r < .77) drawSky(); }, 400);
  });
  // thị sai: camera 3D đổi → lớp sao dịch nhẹ (chỉ cập nhật khi camera đổi, không vòng lặp riêng)
  var TH0 = .695, PH0 = .94, R0 = 19;
  function skyCam(th, ph, r) {
    if (reduceMq.matches || !skyNear) return;
    var z = clamp((R0 - r) / R0, -1.6, .7);
    var sN = 1 + z * .045, sF = 1 + z * .018;
    var vw = window.innerWidth, vh = window.innerHeight;
    var mxN = Math.max(0, (1.16 * sN - 1) / 2 * vw - 4), myN = Math.max(0, (1.16 * sN - 1) / 2 * vh - 4);
    var dx = clamp((th - TH0) * -70, -mxN, mxN), dy = clamp((ph - PH0) * 50, -myN, myN);
    skyNear.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
    skyNear.style.scale = sN.toFixed(4);
    skyFar.style.translate = (dx * .4).toFixed(1) + 'px ' + (dy * .4).toFixed(1) + 'px';
    skyFar.style.scale = sF.toFixed(4);
  }

  // ───────── Vệt phản chiếu trên kính chạy theo con trỏ (chỉ khi có chuột) ─────────
  if (hoverMq.matches) {
    var lit = null, litRaf = 0, litEv = null;
    var applyLit = function () {
      litRaf = 0; var e = litEv; if (!e) return;
      var t = e.target && e.target.closest ? e.target.closest('.lg, .island') : null;
      if (lit && lit !== t) lit.classList.remove('is-lit');
      lit = t; if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', Math.round(e.clientX - r.left) + 'px');
      t.style.setProperty('--my', Math.round(e.clientY - r.top) + 'px');
      t.classList.add('is-lit');
    };
    document.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; litEv = e; if (!litRaf) litRaf = requestAnimationFrame(applyLit); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { if (lit) lit.classList.remove('is-lit'); lit = null; });
  }

  // ───────── DYNAMIC ISLAND ─────────
  var wrap = document.querySelector('.island-wrap'), island = document.querySelector('.island');
  var islIn = island.querySelector('.isl-in'), menuBtn = island.querySelector('.isl-btn'), panel = document.getElementById('isl-menu');
  var liveBox = island.querySelector('.isl-live'), ring = island.querySelector('.isl-ring .val'), dot = island.querySelector('.isl-dot');
  var liveNo = island.querySelector('.isl-no'), liveTxt = island.querySelector('.isl-txt'), liveSub = island.querySelector('.isl-sub');
  var say = document.getElementById('isl-say');
  var menuOpen = false, stageOn = false, live = { kind: 'none' }, savedOn = false, savedT = 0, sayT = 0, lastP = -1, swapT = 0;

  function sizeIsland() { island.style.width = islIn.offsetWidth + 'px'; island.style.height = islIn.offsetHeight + 'px'; }
  if ('ResizeObserver' in window) new ResizeObserver(sizeIsland).observe(islIn);
  sizeIsland();
  var unfreeze = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { island.classList.remove('no-anim'); }); }); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sizeIsland(); unfreeze(); }); else unfreeze();

  function announce(t, now) {
    clearTimeout(sayT);
    if (now) say.textContent = t; else sayT = setTimeout(function () { say.textContent = t; }, 700);
  }
  function modeNow() {
    if (menuOpen) return 'menu';
    if (stageOn && (savedOn || live.kind !== 'none')) return 'live';
    return 'idle';
  }
  function setMode() {
    var m = modeNow();
    if (island.getAttribute('data-mode') !== m) {
      island.setAttribute('data-mode', m);
      island.classList.remove('is-swap'); void island.offsetWidth; island.classList.add('is-swap');
      clearTimeout(swapT); swapT = setTimeout(function () { island.classList.remove('is-swap'); }, 600);
      if (m !== 'idle') setAway(false);
    }
    renderLive();
  }
  function setRing(p) { if (Math.abs(p - lastP) < .004 && p < 1) return; lastP = p; ring.setAttribute('stroke-dashoffset', (100 - clamp(p, 0, 1) * 100).toFixed(1)); }
  var shown = '';
  function renderLive() {
    var k = savedOn ? 'saved' : live.kind, no = '', txt = '', sub = '';
    if (k === 'step') { no = live.no + ' / 08'; txt = live.name; setRing(live.p); }
    else if (k === 'sel') { txt = live.name; sub = live.mat || ''; dot.style.background = live.sw || '#888'; }
    else if (k === 'saved') { txt = 'Đã lưu phòng'; }
    liveBox.setAttribute('data-kind', k);
    var key = k + '|' + no + '|' + txt;
    if (key !== shown) {
      liveNo.textContent = no; liveTxt.textContent = txt;
      if (shown && island.getAttribute('data-mode') === 'live') { liveBox.classList.remove('is-tick'); void liveBox.offsetWidth; liveBox.classList.add('is-tick'); }
      shown = key;
    }
    if (liveSub.textContent !== sub) liveSub.textContent = sub;
  }
  // gọi từ khối 3D: { kind: 'step', no, name, p, playing } · { kind: 'sel', name, mat, sw } · { kind: 'saved' } · { kind: 'none' }
  function onLive(s) {
    if (s.kind === 'saved') {
      savedOn = true; clearTimeout(savedT);
      savedT = setTimeout(function () { savedOn = false; setMode(); }, 2000);
      if (stageOn) announce('Đã lưu phòng', true);
      setMode(); return;
    }
    var prev = live; live = s;
    if (s.kind !== 'none' && savedOn) { savedOn = false; clearTimeout(savedT); }
    if (s.kind === 'step' && prev.kind === 'step' && prev.no === s.no && island.getAttribute('data-mode') === modeNow()) { setRing(s.p); return; }
    if (stageOn) {
      if (s.kind === 'step' && (prev.kind !== 'step' || prev.no !== s.no)) announce('Bước ' + s.no + ' trên 08: ' + s.name, false);
      else if (s.kind === 'sel' && (prev.kind !== 'sel' || prev.name !== s.name)) announce('Đang chọn ' + s.name + ', vật liệu ' + s.mat, true);
    }
    setMode();
  }

  // menu
  function openMenu() {
    if (menuOpen) return;
    menuOpen = true; panel.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Đóng menu');
    setMode();
    var a = panel.querySelector('a[href]'); if (a) a.focus({ preventScroll: true });
  }
  function closeMenu(focusBtn) {
    if (!menuOpen) return;
    menuOpen = false; panel.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Mở menu');
    setMode();
    if (focusBtn) menuBtn.focus({ preventScroll: true });
  }
  menuBtn.addEventListener('click', function () { if (menuOpen) closeMenu(false); else openMenu(); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { e.preventDefault(); closeMenu(true); } });
  document.addEventListener('pointerdown', function (e) { if (menuOpen && !island.contains(e.target)) closeMenu(false); }, true);
  island.addEventListener('focusout', function (e) { if (menuOpen && e.relatedTarget && !island.contains(e.relatedTarget)) closeMenu(false); });
  island.addEventListener('focusin', function () { setAway(false); });

  // máy tính: cuộn xuống nhanh → island lánh lên; cuộn lên → hiện lại. Điện thoại: luôn hiện.
  var deskMq = window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  // "nhanh" = trang đi xuống > 260 px trong 250 ms gần nhất (đo theo mốc thời gian của sự kiện cuộn, không phụ thuộc nhịp khung hình)
  var away = false, lastY = window.pageYOffset, hist = [], keepUntil = 0;
  function setAway(on) { if (away === on) return; away = on; wrap.classList.toggle('is-away', on); }
  // bấm link trong trang (menu, nút hero…) → trang tự cuộn nhanh, nhưng không giấu island
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) keepUntil = performance.now() + 1600; });
  function onScroll() {
    var y = window.pageYOffset, t = performance.now(), dy = y - lastY;
    lastY = y;
    hist.push([t, y]); while (hist.length > 1 && t - hist[0][0] > 250) hist.shift();
    if (!deskMq.matches || menuOpen || y < 140 || t < keepUntil || island.getAttribute('data-mode') === 'live' || island.contains(document.activeElement)) { setAway(false); return; }
    if (dy > 0 && y - hist[0][1] > 260) setAway(true);
    else if (dy < -3) setAway(false);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // khối 3D trên màn hình → island được báo hoạt động trực tiếp
  var stageEl = document.querySelector('#xem-thu .xt-stage');
  if (stageEl && 'IntersectionObserver' in window) {
    // "trên màn hình" = thấy ≥ 40 % khối (lúc khối mới lấp ló dưới hero thì island chưa bận)
    new IntersectionObserver(function (es) { var e = es[es.length - 1]; stageOn = e.isIntersecting && e.intersectionRatio >= .4; setMode(); }, { threshold: [0, .4, .6] }).observe(stageEl);
  }

  window.FTK_UI = {
    live: onLive,
    cam: skyCam,
    slow: function () { root.classList.add('kinh-dac'); }
  };

  // ───────── #thao-tac: kể chuyện theo cuộn (chỉ khi cờ SHOW_ANH_APP bật) ─────────
  // Media từng bước. Khi có clip thật: đổi mục của bước thành { kind: 'video', src: 'media/buoc-04.mp4', poster: 'media/buoc-04.jpg' }
  // (sửa mảng bên dưới, hoặc đặt window.FTK_THAO_TAC trước khi main.js chạy). Script thay ảnh / ô chờ bằng <video muted loop playsinline preload="none">.
  var TT_MEDIA = window.FTK_THAO_TAC || [
    { v: 'V2', kind: 'anh' }, { v: 'V3', kind: 'trong' }, { v: 'V4', kind: 'anh' }, { v: 'V5', kind: 'trong' },
    { v: 'V6', kind: 'trong' }, { v: 'V7', kind: 'anh' }, { v: 'V8', kind: 'trong' }, { v: 'V9 / V10', kind: 'trong' }
  ];
  var SIMS = {
    1: { from: [84, 86], seq: [['move', 18.3, 11.6, 650], ['click'], ['wait', 150], ['move', 47, 24, 520], ['click'], ['wait', 150], ['move', 52, 58, 560], ['wait', 1100]] },
    6: { from: [62, 16], seq: [['move', 33.5, 71, 560], ['wait', 80], ['down'], ['drag', 74, 31, 1100], ['up'], ['wait', 1300]] },
    3: { from: [80, 22], seq: [['move', 41.5, 69.5, 620], ['down'], ['drag', 65, 84.5, 950], ['up'], ['wait', 1400]] }
  };
  var SIM_LOOPS = 3;
  var tt = document.getElementById('thao-tac');
  var story = null;

  function applyVideos(figs, playable) {
    figs.forEach(function (fig, i) {
      var m = TT_MEDIA[i];
      if (!m || m.kind !== 'video' || fig.querySelector('video')) return;
      var label = fig.getAttribute('aria-label') || (fig.querySelector('img') && fig.querySelector('img').alt) || '';
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      if (m.poster) v.poster = m.poster;
      if (label) v.setAttribute('aria-label', label.replace(/^Ô chờ video /, 'Video '));
      if (playable) v.setAttribute('data-src', m.src); else { v.controls = true; v.src = m.src; }
      fig.className = 'tt-media'; fig.removeAttribute('role'); fig.removeAttribute('aria-label');
      fig.innerHTML = ''; fig.appendChild(v);
    });
  }

  function buildSim(slide, cfg) {
    var layer = el('div', 'sim'); layer.setAttribute('aria-hidden', 'true');
    var track = el('div', 'sim-track');
    var cur = el('span', '', '<svg class="sim-cursor" width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v20.6l5.3-5 3.6 8.2 3.7-1.6-3.6-8.1h7.4z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>');
    track.appendChild(cur);
    var T = 0, x = cfg.from[0], y = cfg.from[1];
    var trk = [{ t: 0, x: x, y: y }], cs = [{ t: 0, o: 0, s: 1 }, { t: 220, o: 1, s: 1 }], dots = [], lines = [];
    T = 260;
    var EASE = 'cubic-bezier(.45,0,.2,1)';
    cfg.seq.forEach(function (st) {
      var k = st[0];
      if (k === 'move' || k === 'drag') {
        var x2 = st[1], y2 = st[2], d = st[3];
        trk.push({ t: T, x: x, y: y, e: EASE }); trk.push({ t: T + d, x: x2, y: y2 });
        if (k === 'drag') lines.push({ t0: T, t1: T + d, x: x, y: y, x2: x2, y2: y2 });
        x = x2; y = y2; T += d;
      } else if (k === 'click') {
        cs.push({ t: T, o: 1, s: 1 }, { t: T + 90, o: 1, s: .84 }, { t: T + 200, o: 1, s: 1 });
        dots.push({ t: T + 60, x: x, y: y }); T += 200;
      } else if (k === 'down') {
        cs.push({ t: T, o: 1, s: 1 }, { t: T + 110, o: 1, s: .84 }); dots.push({ t: T + 40, x: x, y: y }); T += 130;
      } else if (k === 'up') {
        cs.push({ t: T, o: 1, s: .84 }, { t: T + 120, o: 1, s: 1 }); dots.push({ t: T + 20, x: x, y: y }); T += 140;
      } else if (k === 'wait') { T += st[1]; }
    });
    cs.push({ t: T, o: 1, s: 1 }, { t: T + 320, o: 0, s: 1 });
    trk.push({ t: T + 320, x: x, y: y });
    T += 520;
    var anims = [];
    function off(t) { return Math.min(1, Math.max(0, t / T)); }
    function kf(list, map) {
      var out = [], last = -1;
      list.forEach(function (p) { var o = Math.max(off(p.t), last); last = o; var f = map(p); f.offset = o; if (p.e) f.easing = p.e; out.push(f); });
      if (out[out.length - 1].offset < 1) { var endF = map(list[list.length - 1]); endF.offset = 1; out.push(endF); }
      if (out[0].offset > 0) { var s = map(list[0]); s.offset = 0; out.unshift(s); }
      return out;
    }
    var specs = [];
    specs.push([track, kf(trk, function (p) { return { transform: 'translate(' + p.x + '%,' + p.y + '%)' }; })]);
    specs.push([cur.firstChild, kf(cs, function (p) { return { opacity: p.o, transform: 'scale(' + p.s + ')' }; })]);
    dots.forEach(function (d) {
      var w = el('div', 'sim-track'); w.style.transform = 'translate(' + d.x + '%,' + d.y + '%)';
      var dt = el('span', 'sim-dot'); w.appendChild(dt); layer.appendChild(w);
      specs.push([dt, kf([
        { t: 0, o: 0, s: .4 }, { t: d.t, o: 0, s: .4 }, { t: d.t + 50, o: .95, s: .55 }, { t: d.t + 620, o: 0, s: 1.5 }
      ], function (p) { return { opacity: p.o, transform: 'scale(' + p.s + ')' }; })]);
    });
    lines.forEach(function (L) {
      var w = el('div', 'sim-track'); w.style.transform = 'translate(' + L.x + '%,' + L.y + '%)';
      var dx = L.x2 - L.x, dy = (L.y2 - L.y) * 9 / 16;
      var len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
      var line = el('span', 'sim-line'); line.style.width = len.toFixed(2) + '%';
      w.appendChild(line); layer.insertBefore(w, layer.firstChild);
      var r = 'rotate(' + ang.toFixed(2) + 'deg) ';
      specs.push([line, kf([
        { t: 0, o: 0, s: 0 }, { t: L.t0, o: 1, s: 0, e: EASE }, { t: L.t1, o: 1, s: 1 }, { t: L.t1 + 300, o: 1, s: 1 }, { t: L.t1 + 800, o: 0, s: 1 }
      ], function (p) { return { opacity: p.o, transform: r + 'scaleX(' + p.s + ')' }; })]);
    });
    layer.appendChild(track);
    slide.appendChild(layer);
    return {
      start: function () {
        this.stop();
        specs.forEach(function (sp) { anims.push(sp[0].animate(sp[1], { duration: T, iterations: SIM_LOOPS, delay: 300, fill: 'both' })); });
      },
      stop: function () { anims.forEach(function (a) { a.cancel(); }); anims = []; }
    };
  }

  function topSafe() { return parseFloat(getComputedStyle(root).getPropertyValue('--top-safe')) || 72; }
  function buildStory() {
    var body = tt.querySelector('.tt-body');
    var lis = Array.prototype.slice.call(tt.querySelectorAll('.tt-step'));
    var figs = lis.map(function (li) { return li.querySelector('.tt-media'); });
    var n = lis.length;
    var stage = el('div', 'tt-stage');
    stage.innerHTML =
      '<div class="tt-stage-in">' +
        '<div class="tt-rail" role="group" aria-label="Chọn bước thao tác"></div>' +
        '<div class="tt-deck">' +
          '<div class="tt-bar"><p class="tt-count" aria-hidden="true"><b>01</b> / 0' + n + '</p><p class="tt-sim">Mô phỏng · video thật sẽ cập nhật</p></div>' +
          '<div class="tt-frame"></div>' +
        '</div>' +
      '</div>';
    var rail = stage.querySelector('.tt-rail'), frame = stage.querySelector('.tt-frame');
    var countB = stage.querySelector('.tt-count b'), simBadge = stage.querySelector('.tt-sim');
    applyVideos(figs, true);
    var slides = [], btns = [], sims = [], videos = [];
    figs.forEach(function (fig, i) {
      var s = el('div', 'tt-slide' + (i > 0 ? '' : ' is-active'));
      s.appendChild(fig); frame.appendChild(s); slides.push(s);
      videos.push(fig.querySelector('video'));
      var m = TT_MEDIA[i] || {};
      sims.push(SIMS[i + 1] && m.kind === 'anh' && Element.prototype.animate ? buildSim(s, SIMS[i + 1]) : null);
      var b = el('button'); b.type = 'button';
      b.setAttribute('aria-label', 'Bước ' + (i + 1) + ': ' + lis[i].querySelector('h3').textContent);
      b.addEventListener('click', function () { goTo(i); });
      rail.appendChild(b); btns.push(b);
    });
    body.appendChild(stage);
    tt.classList.add('is-story');

    var cur = -1, inView = false, io = null, ioSec = null, line = 0, rT = 0;
    function loadVideo(i) { var v = videos[i]; if (v && v.getAttribute('data-src') && !v.src) { v.src = v.getAttribute('data-src'); v.preload = 'auto'; v.load(); } }
    function sync(prev) {
      sims.forEach(function (s, k) {
        if (!s || k === cur) return;
        if (k === prev && inView) setTimeout(function () { if (cur !== k) s.stop(); }, 450);
        else s.stop();
      });
      videos.forEach(function (v, k) { if (v && (k !== cur || !inView)) v.pause(); });
      if (!inView || cur < 0) { if (sims[cur]) sims[cur].stop(); return; }
      if (sims[cur]) sims[cur].start();
      loadVideo(cur); loadVideo(cur + 1);
      if (videos[cur]) { var p = videos[cur].play(); if (p && p.catch) p.catch(function () {}); }
    }
    function setActive(i) {
      if (i === cur) return;
      var prev = cur; cur = i;
      slides.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i); s.classList.toggle('is-before', k < i);
        s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
      });
      lis.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      btns.forEach(function (b, k) {
        if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.classList.toggle('is-done', k < i);
      });
      countB.textContent = (i < 9 ? '0' : '') + (i + 1);
      simBadge.classList.toggle('is-on', !!sims[i]);
      sync(prev);
    }
    function lineY() {
      var vh = window.innerHeight, top = topSafe();
      if (window.innerWidth >= 1024) return Math.round((top + vh) / 2);
      var sb = top + stage.getBoundingClientRect().height;
      return Math.round((sb + vh) / 2);
    }
    function pickByGeometry() {
      var hit = -1;
      for (var k = 0; k < n; k++) {
        var r = lis[k].getBoundingClientRect();
        if (r.top <= line && r.bottom > line) { hit = k; break; }
      }
      if (hit < 0) hit = lis[0].getBoundingClientRect().top > line ? 0 : (lis[n - 1].getBoundingClientRect().bottom <= line ? n - 1 : cur);
      if (hit >= 0) setActive(hit);
    }
    function observe() {
      if (io) io.disconnect();
      tt.style.setProperty('--tt-stage-h', window.innerWidth >= 1024 ? '0px' : Math.round(stage.getBoundingClientRect().height) + 'px');
      line = lineY();
      var vh = window.innerHeight;
      io = new IntersectionObserver(function () { pickByGeometry(); },
        { rootMargin: (-line) + 'px 0px ' + (-(vh - line - 1)) + 'px 0px', threshold: 0 });
      lis.forEach(function (li) { io.observe(li); });
      pickByGeometry();
    }
    function goTo(i) {
      var r = lis[i].getBoundingClientRect();
      window.scrollTo({ top: Math.round(window.pageYOffset + r.top + r.height / 2 - line), behavior: 'smooth' });
    }
    ioSec = new IntersectionObserver(function (es) {
      es.forEach(function (e) { inView = e.isIntersecting; });
      if (inView) {
        frame.classList.add('is-instant'); tt.classList.add('is-instant');
        pickByGeometry();
        requestAnimationFrame(function () { requestAnimationFrame(function () { frame.classList.remove('is-instant'); tt.classList.remove('is-instant'); }); });
      }
      sync();
    }, { threshold: 0 });
    ioSec.observe(tt);
    function onResize() { clearTimeout(rT); rT = setTimeout(observe, 150); }
    window.addEventListener('resize', onResize);
    setActive(0);
    observe();

    return {
      destroy: function () {
        if (io) io.disconnect(); ioSec.disconnect(); window.removeEventListener('resize', onResize);
        sims.forEach(function (s) { if (s) s.stop(); });
        videos.forEach(function (v) { if (v) { v.pause(); v.controls = true; if (!v.src && v.getAttribute('data-src')) v.src = v.getAttribute('data-src'); } });
        figs.forEach(function (fig, i) { var sim = fig.parentNode.querySelector('.sim'); if (sim) sim.remove(); lis[i].appendChild(fig); lis[i].classList.remove('is-active'); });
        stage.remove(); tt.classList.remove('is-story'); tt.style.removeProperty('--tt-stage-h');
      }
    };
  }

  if (tt) {
    if (root.classList.contains('js-motion')) story = buildStory();
    else applyVideos(Array.prototype.slice.call(tt.querySelectorAll('.tt-media')), false);
  }

  // ───────── Hiện khi cuộn: 1 lần, rồi bỏ theo dõi ─────────
  if (root.classList.contains('js-motion')) {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { rio.observe(e); });
    var off = function () {
      if (!reduceMq.matches) return;
      rio.disconnect();
      els.forEach(function (e) { e.classList.add('is-in'); });
      root.classList.remove('js-motion');
      if (story) { story.destroy(); story = null; }
      [skyNear, skyFar].forEach(function (c) { if (c) { c.style.translate = ''; c.style.scale = ''; } });
    };
    if (reduceMq.addEventListener) reduceMq.addEventListener('change', off); else if (reduceMq.addListener) reduceMq.addListener(off);
  }
  window.__ftkReady = true;

  // ───────── #xem-thu: nạp mã 3D khi khối còn cách màn hình ~2/3 màn hình ─────────
  // three.js + addon nằm ở vendor/three/ (import map trong index.html); mã cảnh ở js/xt-app.js, nạp bằng import() đúng lúc này.
  // Không WebGL / trình duyệt không hỗ trợ import map / lỗi nạp → ảnh chụp sẵn + 1 câu giải thích.
  var xtStage = document.querySelector('#xem-thu .xt-stage');
  if (xtStage) {
    xtStage.classList.add('is-js');
    var xtUi = window.FTK_UI || null;
    var xtFallback = function () {
      if (xtStage.classList.contains('is-fallback')) return;
      xtStage.classList.add('is-fallback');
      var ns = xtStage.querySelector('noscript');
      var tpl = document.createElement('template');
      tpl.innerHTML = ns ? ns.textContent : '';
      var fb = tpl.content.querySelector('.xt-fallback') || document.createElement('div');
      fb.className = 'xt-fallback';
      var note = fb.querySelector('.xt-fb-note') || fb.appendChild(document.createElement('p'));
      note.className = 'xt-fb-note';
      note.textContent = 'Máy hoặc trình duyệt này chưa chạy được 3D (WebGL), nên đây là ảnh chụp phòng mẫu. Mô phỏng trên web — dựng bằng code để minh hoạ, không phải giao diện app.';
      var fbImg = fb.querySelector('img'); if (fbImg) fbImg.loading = 'eager';
      xtStage.appendChild(fb);
    };
    var xtHasGL = function () {
      try {
        var c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
      } catch (e) { return false; }
    };
    var xtBoot = async function () {
      if (!xtHasGL()) { xtFallback(); return; }
      try {
        var m = await import('./js/xt-app.js?v=' + encodeURIComponent(cfg('PAGE_VERSION') || '1'));
        m.start(xtStage, {
          reduced: function () { return reduceMq.matches; },
          onLost: xtFallback,
          flyIn: true,                                         // lần đầu vào màn hình: camera bay vào "Toàn cảnh"
          onLive: xtUi ? xtUi.live : null,                     // island báo bước đang phát / món đang chọn / đã lưu
          onCamera: xtUi ? xtUi.cam : null,                    // thị sai lớp sao
          onSlow: xtUi ? xtUi.slow : null                      // khung hình chậm → kính thành nền đặc
        });
      } catch (e) { xtFallback(); }
    };
    if ('IntersectionObserver' in window) {
      // Chỉ bắt đầu theo dõi sau sự kiện load + lúc trình duyệt rảnh (tối đa ~1,5 s): chữ đầu trang và ảnh được tải trước, 3D khởi động sau.
      var xtWatch = function () {
        var xtIo = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { xtIo.disconnect(); xtBoot(); }
        }, { rootMargin: '600px 0px 600px 0px' });
        xtIo.observe(xtStage);
      };
      var xtIdle = function () { if (window.requestIdleCallback) window.requestIdleCallback(xtWatch, { timeout: 1500 }); else setTimeout(xtWatch, 200); };
      if (document.readyState === 'complete') xtIdle(); else window.addEventListener('load', xtIdle, { once: true });
    } else xtFallback();
  }

  // ───────── Khối Ảnh AI (#anh-ai): thành phần xem ảnh ở anh-ai/ (bản sinh ra từ gói bàn giao — không sửa tay) ─────────
  // Chỉ tải CSS + mã + dữ liệu + ảnh khi khách cuộn gần tới khối (400 px), và chỉ bắt đầu theo dõi sau load như khối 3D.
  // Bản giới thiệu không có máy chủ AI: yêu cầu của khách chuyển sang phiên bản dựng sẵn khớp món đó.
  var aiVp = document.getElementById('anh-ai-vp');
  if (aiVp) {
    var AI_GOC = 'anh-ai/', aiV = '?v=' + encodeURIComponent(cfg('PAGE_VERSION') || '1');
    var aiCho = function (t) { aiVp.innerHTML = ''; var p = document.createElement('p'); p.className = 'anh-ai-cho'; p.textContent = t; aiVp.appendChild(p); };
    var aiCss = function () {
      return new Promise(function (ok) {
        if (document.querySelector('link[data-anh-ai]')) return ok();
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = AI_GOC + 'ftk_viewport.css' + aiV; l.setAttribute('data-anh-ai', '');
        l.onload = ok; l.onerror = ok; document.head.appendChild(l);
      });
    };
    var aiJs = function () {
      return new Promise(function (ok, loi) {
        if (window.FtkViewport) return ok();
        var s = document.createElement('script'); s.src = AI_GOC + 'ftk_viewport.js' + aiV; s.onload = ok; s.onerror = loi; document.head.appendChild(s);
      });
    };
    // Thành phần gọi scrollIntoView({block:'nearest'}) lên chip phiên bản đang xem để dải cuộn ngang theo kịp. Trên trang
    // cuộn dài, lệnh đó kéo CẢ TRANG về khối này (vd đang bấm "Đăng ký dùng thử" cuộn tới #lien-he thì bị dừng giữa đường).
    // Không sửa được anh-ai/ (bản sinh ra) → ở đây chỉ cho chip trong dải cuộn ngang trong dải, không đụng cuộn trang.
    // Bỏ đoạn này khi gói Ảnh AI mới đã tự cuộn dải bằng scrollLeft.
    var aiSiv = Element.prototype.scrollIntoView;
    if (!aiSiv.__ftkAnhAi) {
      var aiSivMoi = function () {
        var ban = this.closest && this.closest('#anh-ai .ftkv-ban');
        if (!ban) return aiSiv.apply(this, arguments);
        var r = this.getBoundingClientRect(), b = ban.getBoundingClientRect();
        if (r.left < b.left) ban.scrollLeft -= b.left - r.left;
        else if (r.right > b.right) ban.scrollLeft += r.right - b.right;
      };
      aiSivMoi.__ftkAnhAi = true;
      Element.prototype.scrollIntoView = aiSivMoi;
    }
    var aiBat = function () {
      Promise.all([aiCss(), aiJs(), fetch(AI_GOC + 'du_lieu.json' + aiV).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
      })]).then(function (kq) {
        var D = kq[2];
        aiVp.textContent = '';
        var vp = new window.FtkViewport(aiVp, new window.FtkNguon.Tinh(D.canh, AI_GOC), {
          phimToanTrang: false,
          guiYeuCau: async function (yc) {
            var dich = yc.mon && D.dung[yc.mon];
            if (!dich) { vp.bao('Bản giới thiệu: thử chọn sofa hoặc bàn trà rồi gửi yêu cầu.'); return; }
            vp.bao('Bản giới thiệu — đang dùng kết quả dựng sẵn…', false, true);
            await new Promise(function (r) { setTimeout(r, 650); });
            await vp.chonBan(dich);
          }
        });
        return vp.tai();
      }).catch(function () { aiCho('Chưa tải được ảnh mẫu — thử tải lại trang.'); });
    };
    if ('IntersectionObserver' in window) {
      var aiWatch = function () {
        var aiIo = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { aiIo.disconnect(); aiBat(); }
        }, { rootMargin: '400px 0px 400px 0px' });
        aiIo.observe(aiVp);
      };
      var aiIdle = function () { if (window.requestIdleCallback) window.requestIdleCallback(aiWatch, { timeout: 1500 }); else setTimeout(aiWatch, 200); };
      if (document.readyState === 'complete') aiIdle(); else window.addEventListener('load', aiIdle, { once: true });
    } else aiBat();
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
