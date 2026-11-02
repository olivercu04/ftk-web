// #xem-thu — "Phòng 3D xem thử". Module ES; main.js nạp bằng import(); 'three' và addon do import map trong index.html trỏ tới vendor/three/.
// Cảnh dựng bằng code kiểu mô hình kiến trúc (maquette) — KHÔNG dùng mô hình / ảnh của app. Dữ liệu đồ / vật liệu = mô phỏng.
// Máy yếu: chỉ vẽ khi có thay đổi · dừng khi ra khỏi màn hình / tab ẩn · pixel ratio ≤ 1,5 · 1 đèn đổ bóng (bản đồ 1024,
// chỉ vẽ lại bóng khi đồ di chuyển) · không bloom / hậu kỳ (quầng sáng giả bằng texture cộng màu).
// Điểm chính: nền canvas trong suốt → phòng lơ lửng giữa thiên hà của trang · mặc định Đêm · camera bay vào lần đầu ·
//     báo trạng thái cho island (opt.onLive) · báo góc camera cho lớp sao (opt.onCamera) · báo khung hình chậm (opt.onSlow).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const DEG = Math.PI / 180;
const T_END = 14.2;
// Mốc dòng thời gian — trùng tên 8 bước của khối "Xem thao tác"
const MOC = [
  { t: 0,    no: '',   name: 'Phòng trống',               sub: 'Chưa có món nào trong phòng' },
  { t: 0.8,  no: '01', name: 'Mở kho đồ',                 sub: 'Đồ nội thất, vật liệu và combo chung một cửa sổ' },
  { t: 2.0,  no: '02', name: 'Kéo đồ vào phòng',          sub: '' },
  { t: 5.6,  no: '03', name: 'Chọn rồi chỉnh bằng gizmo', sub: 'Kéo trục đỏ, ghế bành nhích theo bước lưới' },
  { t: 7.2,  no: '04', name: 'Gom đồ thành nhóm',         sub: 'Bàn ăn và 4 ghế thành một nhóm' },
  { t: 8.6,  no: '05', name: 'Thay đồ tại chỗ',           sub: 'Ghế bành đổi mẫu, giữ vị trí và hướng xoay' },
  { t: 10.0, no: '06', name: 'Đổi vật liệu từng vùng',    sub: 'Vải bọc sofa: lanh xám → xanh rêu' },
  { t: 11.4, no: '07', name: 'Lưu cả bộ thành combo',     sub: 'Bộ bàn ăn vào tab combo của kho' },
  { t: 12.6, no: '08', name: 'Lưu phòng, hoàn tác dễ',    sub: 'Đặt tên rồi lưu, mở lại khi cần' },
];
// Kết quả từng mốc (chế độ giảm chuyển động: Phát nhảy thẳng tới đây, không bay)
const MOC_RESULT = [0, 1.9, 5.58, 7.15, 8.55, 9.95, 11.35, 12.5, T_END];

// Vật liệu mô phỏng (chỉ đổi giữa các mẫu có sẵn)
const MATS = {
  'go-soi':      { name: 'Gỗ sồi sáng',        color: '#C9A47C', rough: .62, metal: 0,   map: 'grain', sw: '#C9A47C' },
  'go-oc-cho':   { name: 'Gỗ óc chó',          color: '#6E4A33', rough: .55, metal: 0,   map: 'grain', sw: '#6E4A33' },
  'cam-thach':   { name: 'Đá cẩm thạch trắng', color: '#FFFFFF', rough: .25, metal: 0,   map: 'marble', sw: 'linear-gradient(135deg,#f4f2ee 0 40%,#b9b6b0 46%,#efede9 52% 100%)' },
  'son-den':     { name: 'Sơn đen mờ',         color: '#2E2C2A', rough: .72, metal: 0,   map: 'noise', sw: '#2E2C2A' },
  'lanh-xam':    { name: 'Vải lanh xám',       color: '#8E8983', rough: .96, metal: 0,   map: 'weave', sw: '#8E8983' },
  'xanh-reu':    { name: 'Vải xanh rêu',       color: '#5F6B4C', rough: .96, metal: 0,   map: 'weave', sw: '#5F6B4C' },
  'da-nau':      { name: 'Da bò nâu',          color: '#7A4A2E', rough: .48, metal: 0,   map: 'noise', sw: '#7A4A2E' },
  'ni-kem':      { name: 'Nỉ kem',             color: '#D7CCBB', rough: .96, metal: 0,   map: 'weave', sw: '#D7CCBB' },
  'boucle':      { name: 'Vải bouclé kem',     color: '#DED5C6', rough: 1,   metal: 0,   map: 'boucle', sw: '#DED5C6' },
  'dat-nung-v':  { name: 'Vải đất nung',       color: '#A85E43', rough: .96, metal: 0,   map: 'weave', sw: '#A85E43' },
  'xanh-than':   { name: 'Vải xanh than',      color: '#3E4757', rough: .96, metal: 0,   map: 'weave', sw: '#3E4757' },
  'len-be':      { name: 'Len be',             color: '#CDBFA9', rough: 1,   metal: 0,   map: 'rug', sw: '#CDBFA9' },
  'len-tro':     { name: 'Len xám tro',        color: '#8F8B85', rough: 1,   metal: 0,   map: 'rug', sw: '#8F8B85' },
  'len-reu':     { name: 'Len xanh rêu',       color: '#7F8B6C', rough: 1,   metal: 0,   map: 'rug', sw: '#7F8B6C' },
  'lanh-trang':  { name: 'Vải lanh trắng',     color: '#EFE8DC', rough: .9,  metal: 0,   map: 'weave', sw: '#EFE8DC', glow: 1 },
  'dong-thau':   { name: 'Đồng thau',          color: '#B8915A', rough: .34, metal: .9,  map: 'noise', sw: 'linear-gradient(135deg,#d9b77e,#94703e)', glow: .12 },
  'gom-trang':   { name: 'Gốm trắng',          color: '#E9E4DB', rough: .4,  metal: 0,   map: 'noise', sw: '#E9E4DB' },
  'dat-nung':    { name: 'Đất nung',           color: '#B4643F', rough: .82, metal: 0,   map: 'noise', sw: '#B4643F' },
  'gom-den':     { name: 'Gốm đen',            color: '#302E2C', rough: .45, metal: 0,   map: 'noise', sw: '#302E2C' },
  'tranh-am':    { name: 'Tranh khối màu ấm',  color: '#FFFFFF', rough: .8,  metal: 0,   map: 'art0', sw: 'linear-gradient(135deg,#e9dfcf 0 45%,#c2673f 45% 70%,#d9a441 70%)' },
  'tranh-net':   { name: 'Tranh nét mảnh',     color: '#FFFFFF', rough: .8,  metal: 0,   map: 'art1', sw: 'linear-gradient(135deg,#f3efe7 0 46%,#2b2a28 46% 54%,#f3efe7 54%)' },
  'tranh-dat':   { name: 'Tranh dải màu đất',  color: '#FFFFFF', rough: .8,  metal: 0,   map: 'art2', sw: 'linear-gradient(180deg,#d8c3a2 0 33%,#a8693f 33% 66%,#6c7550 66%)' },
};

// Món đồ (mô phỏng). order = thứ tự "món trước / món sau".
const ITEMS = [
  { id: 'sofa',     name: 'Sofa 3 chỗ',       loai: 'Sofa',              bam: 'Sàn',            vung: 'vải bọc',  mats: ['lanh-xam', 'xanh-reu', 'da-nau', 'ni-kem'], mat: 'xanh-reu',  nhom: 'Nhóm Góc sofa' },
  { id: 'arm',      name: 'Ghế bành tròn',    loai: 'Ghế bành',          bam: 'Sàn',            vung: 'vải bọc',  mats: ['boucle', 'dat-nung-v', 'xanh-than'],          mat: 'boucle',    nhom: 'Nhóm Góc sofa' },
  { id: 'coffee',   name: 'Bàn trà tròn',     loai: 'Bàn trà',           bam: 'Sàn (trên thảm)', vung: 'mặt bàn', mats: ['go-oc-cho', 'cam-thach', 'go-soi'],          mat: 'go-oc-cho', nhom: 'Nhóm Góc sofa' },
  { id: 'rug',      name: 'Thảm len',         loai: 'Thảm',              bam: 'Sàn',            vung: 'mặt thảm', mats: ['len-be', 'len-tro', 'len-reu'],               mat: 'len-be',    nhom: 'Nhóm Góc sofa' },
  { id: 'lamp',     name: 'Đèn cây',          loai: 'Đèn',               bam: 'Sàn',            vung: 'chao đèn', mats: ['lanh-trang', 'dong-thau'],                    mat: 'lanh-trang', nhom: 'Không thuộc nhóm' },
  { id: 'art',      name: 'Tranh treo tường', loai: 'Tranh',             bam: 'Tường',          vung: 'mặt tranh', mats: ['tranh-am', 'tranh-net', 'tranh-dat'],        mat: 'tranh-am',  nhom: 'Không thuộc nhóm' },
  { id: 'shelf',    name: 'Kệ sách mở',       loai: 'Kệ',                bam: 'Sàn, sát tường', vung: 'khung kệ', mats: ['go-soi', 'go-oc-cho', 'son-den'],             mat: 'go-soi',    nhom: 'Không thuộc nhóm' },
  { id: 'plant',    name: 'Chậu cây',         loai: 'Cây trang trí',     bam: 'Sàn',            vung: 'chậu',     mats: ['gom-trang', 'dat-nung', 'gom-den'],           mat: 'gom-trang', nhom: 'Không thuộc nhóm' },
  { id: 'dtable',   name: 'Bàn ăn chữ nhật',  loai: 'Bàn ăn',            bam: 'Sàn',            vung: 'mặt bàn',  mats: ['go-soi', 'go-oc-cho', 'cam-thach'],          mat: 'go-soi',    nhom: 'Nhóm Bàn ăn · combo Bàn ăn 4 ghế' },
  { id: 'chair1',   name: 'Ghế ăn',           loai: 'Ghế ăn',            bam: 'Sàn',            vung: 'khung ghế', mats: ['go-soi', 'go-oc-cho', 'son-den'],            mat: 'go-oc-cho', nhom: 'Nhóm Bàn ăn · combo Bàn ăn 4 ghế' },
  { id: 'sconce',   name: 'Đèn tường',        loai: 'Đèn',               bam: 'Tường',          vung: 'chao đèn', mats: ['lanh-trang', 'dong-thau'],                    mat: 'dong-thau', nhom: 'Không thuộc nhóm' },
];
const EXTRA_CHAIRS = ['chair2', 'chair3', 'chair4'];   // chọn được bằng chuột, dùng chung dữ liệu với chair1
const DINING = ['dtable', 'chair1', 'chair2', 'chair3', 'chair4'];
// Thứ tự thả đồ ở mốc 02 (giây bắt đầu)
const DROPS = [
  ['rug', 2.05], ['sofa', 2.3], ['arm', 2.55], ['coffee', 2.8], ['lamp', 3.05], ['shelf', 3.3], ['plant', 3.55],
  ['art', 3.8], ['dtable', 4.1], ['chair1', 4.35], ['chair2', 4.5], ['chair3', 4.65], ['chair4', 4.8], ['sconce', 5.0],
];
const DROP_DUR = 0.5;

// Góc nhìn có sẵn: điểm nhìn, hướng (từ điểm nhìn ra camera), khoảng cách, bề ngang cần thấy
const VIEWS = {
  toan:  { target: [0.15, -0.45, 0.1],  dir: [0.6, 0.66, 0.72],  dist: 18,   fitW: 11.2, fitH: 10.2, mobDy: 1.1 },
  sofa:  { target: [-1.6, 0.58, -1.75],  dir: [0.36, 0.22, 1],    dist: 6.6,  fitW: 4.0 },
  an:    { target: [1.75, 0.5, -1.0],    dir: [0.62, 0.46, 0.85], dist: 7.6,  fitW: 4.2 },
  tren:  { target: [-0.1, 0, 0.05],      dir: [0, 1, 0.0008],     dist: 16,   fitW: 10.6, fitH: 10.6 },
};

// ───────── tiện ích ─────────
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x) => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeOutBack = (x) => { x = clamp01(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function dropCurve(p) { // 1 → 0, nảy nhẹ khi chạm sàn
  p = clamp01(p);
  if (p < .72) { const q = p / .72; return 1 - q * q; }
  return .05 * Math.sin((p - .72) / .28 * Math.PI);
}
const fmt = (s) => '00:' + String(Math.floor(s + 1e-6)).padStart(2, '0');

export function start(stage, opt) {
  opt = opt || {};
  const reduced = () => !!(opt.reduced && opt.reduced());
  const $ = (s) => stage.querySelector(s);
  const ui = {
    tl: $('.xt-tl'), play: $('.xt-play'), playTxt: $('.xt-play-txt'), range: $('.xt-range input'), ticks: $('.xt-ticks'),
    mocNo: $('.xt-moc b'), mocName: $('.xt-moc span'), mocSub: $('.xt-moc-sub'), time: $('.xt-time'),
    card: $('.xt-card'), cName: $('[data-x="name"]'), cIdx: $('[data-x="idx"]'), cCnt: $('[data-x="cnt"]'), cLoai: $('[data-x="loai"]'),
    cBam: $('[data-x="bam"]'), cVung: $('[data-x="vung"]'), cVl: $('[data-x="vl"]'), cNhom: $('[data-x="nhom"]'), chips: $('.xt-chips'),
    hint: $('.xt-hint'), kho: $('.xt-kho'), khoItem: $('.xt-kho-item'), glabel: $('.xt-glabel'), tip: $('.xt-tip'),
    touch: $('.xt-touch'), done: $('.xt-done'), load: $('.xt-load'),
  };
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');

  // ───────── renderer ─────────
  const canvas = document.createElement('canvas');
  canvas.className = 'xt-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Phòng mẫu 3D dựng bằng code: phòng khách có sofa, ghế bành, bàn trà, thảm, kệ sách, đèn cây, chậu cây, tranh treo tường và góc bàn ăn 4 ghế cạnh cửa sổ.');
  stage.insertBefore(canvas, stage.querySelector('.xt-ui'));
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true, powerPreference: 'default' });
  } catch (e) { canvas.remove(); throw e; }
  const DPR_MAX = 1.5;
  let dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;   // bóng chỉ vẽ lại khi đồ di chuyển (xoay camera không cần)
  renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 120);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pm.dispose();

  // ───────── vân (CanvasTexture) ─────────
  const R = rng(20261102);
  const ANISO = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  function ctex(w, h, draw, rep, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d', { willReadFrequently: true }), w, h);   // canvas nằm ở CPU → tải lên GPU không phải đọc ngược
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }
  const floorTex = ctex(512, 512, (g, w, h) => {
    const rows = 8, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -R() * 300;
      while (x < w) {
        const len = 220 + R() * 300;
        const l = 56 + R() * 7, s = 36 + R() * 12, li = 57 + R() * 9;
        g.fillStyle = `hsl(${29 + R() * 5} ${s}% ${li}%)`;
        g.fillRect(x, r * rh, len, rh);
        g.globalAlpha = .16; g.strokeStyle = `hsl(28 30% ${l - 22}%)`; g.lineWidth = 1;
        for (let k = 0; k < 7; k++) {
          const y0 = r * rh + 4 + R() * (rh - 8), a = 1 + R() * 2.5, f = .01 + R() * .02, ph = R() * 6;
          g.beginPath(); for (let xx = x; xx < x + len; xx += 6) g.lineTo(xx, y0 + Math.sin(xx * f + ph) * a); g.stroke();
        }
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(70,45,25,.38)'; g.fillRect(x, r * rh, 1.5, rh);
        x += len;
      }
      g.fillStyle = 'rgba(70,45,25,.32)'; g.fillRect(0, r * rh, w, 1.5);
    }
  }, [7.2 / 1.28, 5.6 / 1.28]);
  const grainTex = ctex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 70; k++) {
      const y0 = R() * h, a = 1 + R() * 3, f = .015 + R() * .03, ph = R() * 6;
      g.strokeStyle = `rgba(90,70,50,${.05 + R() * .12})`; g.lineWidth = .6 + R() * 1.4;
      g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, y0 + Math.sin(x * f + ph) * a); g.stroke();
    }
  }, [1, 1]);
  const weaveTex = ctex(128, 128, (g, w, h) => {
    g.fillStyle = '#ececec'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${.03 + R() * .05})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${.04 + R() * .06})`; g.fillRect(x, 0, 1, h); }
    for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(0,0,0,${R() * .06})`; g.fillRect(R() * w, R() * h, 1, 1); }
  }, [3, 3]);
  const boucleTex = ctex(128, 128, (g, w, h) => {
    g.fillStyle = '#efefef'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) { const r = 1 + R() * 2.2; g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${.05 + R() * .1})`; g.beginPath(); g.arc(R() * w, R() * h, r, 0, 7); g.fill(); }
  }, [3, 3]);
  const noiseTex = ctex(128, 128, (g, w, h) => {
    g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 1400; k++) { g.fillStyle = `rgba(0,0,0,${R() * .05})`; g.fillRect(R() * w, R() * h, 2, 2); }
  }, [2, 2]);
  const marbleTex = ctex(512, 512, (g, w, h) => {
    g.fillStyle = '#f3f1ed'; g.fillRect(0, 0, w, h);
    g.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      g.strokeStyle = `rgba(120,116,110,${.12 + R() * .2})`; g.lineWidth = .8 + R() * 2.4;
      let x = R() * w, y = 0; g.beginPath(); g.moveTo(x, y);
      while (y < h) { x += (R() - .45) * 40; y += 20 + R() * 30; g.lineTo(x, y); }
      g.stroke();
    }
    g.filter = 'blur(1.2px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
  }, [1, 1]);
  const rugTex = ctex(512, 368, (g, w, h) => {
    g.fillStyle = '#efefef'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(0,0,0,${R() * .05})`; g.fillRect(R() * w, R() * h, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 10; g.strokeRect(26, 26, w - 52, h - 52);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; g.strokeRect(46, 46, w - 92, h - 92);
    g.fillStyle = 'rgba(0,0,0,.07)';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { g.save(); g.translate(96 + i * 64, 92 + j * 62); g.rotate(Math.PI / 4); g.fillRect(-9, -9, 18, 18); g.restore(); }
  }, [1, 1]);
  const artTex = [0, 1, 2].map((v) => ctex(384, 256, (g, w, h) => {
    if (v === 0) {
      g.fillStyle = '#E8DECD'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#C2673F'; g.beginPath(); g.arc(w * .38, h * .55, 70, 0, 7); g.fill();
      g.fillStyle = '#D9A441'; g.fillRect(w * .55, h * .18, 110, 150);
      g.strokeStyle = '#2B2A28'; g.lineWidth = 4; g.beginPath(); g.arc(w * .62, h * .78, 90, Math.PI, Math.PI * 1.6); g.stroke();
      g.fillStyle = '#7C8466'; g.fillRect(w * .12, h * .78, 120, 18);
    } else if (v === 1) {
      g.fillStyle = '#F3EFE7'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2B2A28'; g.lineWidth = 2.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(40, 190);
      g.bezierCurveTo(90, 40, 150, 230, 200, 110); g.bezierCurveTo(240, 20, 300, 160, 345, 70); g.stroke();
      g.beginPath(); g.arc(270, 170, 34, 0, 7); g.stroke();
      g.fillStyle = '#C2673F'; g.beginPath(); g.arc(120, 80, 12, 0, 7); g.fill();
    } else {
      const bands = ['#D8C3A2', '#C79A6B', '#A8693F', '#7D6E50', '#6C7550'];
      bands.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, i * h / 5);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, i * h / 5 + Math.sin(x * .02 + i) * 10 * (i ? 1 : 0)); g.lineTo(w, h); g.lineTo(0, h); g.fill(); });
      g.fillStyle = '#F1E7D6'; g.beginPath(); g.arc(w * .72, h * .22, 22, 0, 7); g.fill();
    }
  }, [1, 1]));
  const ghostTex = ctex(256, 256, (g, w, h) => {
    const r = 28, m = 10;
    g.fillStyle = 'rgba(255,255,255,.3)';
    g.beginPath(); g.roundRect(m, m, w - 2 * m, h - 2 * m, r); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 7; g.setLineDash([22, 14]); g.stroke();
  }, null, false);
  ghostTex.wrapS = ghostTex.wrapT = THREE.ClampToEdgeWrapping;
  const blobTex = ctex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.55, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, null, false);
  blobTex.wrapS = blobTex.wrapT = THREE.ClampToEdgeWrapping;
  const MAPS = { grain: grainTex, weave: weaveTex, boucle: boucleTex, noise: noiseTex, marble: marbleTex, rug: rugTex, art0: artTex[0], art1: artTex[1], art2: artTex[2] };

  // ───────── vật liệu ─────────
  const allMats = [];
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); allMats.push(m); return m; };
  const M = {
    plinth: std({ color: '#1F1D22', roughness: .5, metalness: .3 }),
    floor: std({ color: '#FFFFFF', map: floorTex, roughness: .58 }),
    wall: std({ color: '#EEE9E1', roughness: .93 }),
    cap: std({ color: '#C8BEB0', roughness: .9 }),
    base: std({ color: '#DCD4C8', roughness: .9 }),
    frame: std({ color: '#2F2D2B', roughness: .55, metalness: .2 }),
    glass: std({ color: '#BFD6E6', roughness: .08, transparent: true, opacity: .45, emissive: new THREE.Color('#E3EEF6'), emissiveIntensity: .55, depthWrite: false }),
    metal: std({ color: '#2B2A29', roughness: .45, metalness: .55 }),
    wood: std({ color: '#5A3D2A', map: grainTex, roughness: .55 }),
    cushion: std({ color: '#CBBFAE', map: weaveTex, roughness: .96 }),
    pillow: std({ color: '#B8673F', map: weaveTex, roughness: .96 }),
    soil: std({ color: '#3B2F25', roughness: 1 }),
    leaf: std({ color: '#6E7F55', roughness: .8, flatShading: true }),
    leaf2: std({ color: '#5A6B47', roughness: .8, flatShading: true }),
    bulb: std({ color: '#FFF4E0', emissive: new THREE.Color('#FFD7A0'), emissiveIntensity: 0, roughness: .4 }),
    artFrame: std({ color: '#2E2B28', roughness: .6 }),
  };
  const bookCols = ['#8C5E4A', '#4F5D52', '#C9B79C', '#2F3A44', '#A8A39B', '#7A6A55', '#B9774E', '#5B5F6B'].map((c) => std({ color: c, roughness: .85 }));
  const basket = std({ color: '#B49A72', map: weaveTex, roughness: .9 });
  const vase = std({ color: '#E7E1D6', roughness: .35 });
  function applyPreset(mat, key) {
    const p = MATS[key];
    mat.color.set(p.color); mat.roughness = p.rough; mat.metalness = p.metal;
    mat.map = MAPS[p.map] || noiseTex;
  }
  const zoneMat = (key, extra) => { const m = std(Object.assign({ color: '#ffffff', map: noiseTex }, extra || {})); applyPreset(m, key); return m; };

  // ───────── hình học ─────────
  const geoCache = new Map();
  const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
  const gBox = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
  const gRBox = (w, h, d, r, s = 2) => G(`r${w},${h},${d},${r},${s}`, () => new RoundedBoxGeometry(w, h, d, s, r));
  const gCyl = (rt, rb, h, s = 24, open = false) => G(`c${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent, opts) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    if (opts) { if (opts.rx) m.rotation.x = opts.rx; if (opts.ry) m.rotation.y = opts.ry; if (opts.rz) m.rotation.z = opts.rz; if (opts.noShadow) m.castShadow = false; if (opts.noOutline) m.userData.noOutline = true; }
    if (parent) parent.add(m);
    return m;
  }

  // ───────── vỏ phòng (maquette) ─────────
  const shell = new THREE.Group(); scene.add(shell);
  const X0 = -3.6, X1 = 3.6, Z0 = -2.8, Z1 = 2.8, WT = .15, WH = 2.6;
  mesh(gBox(7.75, .16, 6.15), M.plinth, -0.075, -0.1, -0.075, shell).castShadow = true;
  const fl = mesh(gBox(7.2, .02, 5.6), M.floor, 0, -0.01, 0, shell); fl.castShadow = false;
  const wallMats = [M.wall, M.wall, M.cap, M.wall, M.wall, M.wall];
  function wallPiece(x0, x1, y0, y1, z0, z1) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), wallMats);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; shell.add(m);
  }
  // tường sau (z = Z0), ô cửa sổ x 0.85…2.85, y 0.8…2.3
  const BW = [0.85, 2.85], BH = [0.8, 2.3];
  wallPiece(X0 - WT, BW[0], -0.02, WH, Z0 - WT, Z0);
  wallPiece(BW[1], X1, -0.02, WH, Z0 - WT, Z0);
  wallPiece(BW[0], BW[1], -0.02, BH[0], Z0 - WT, Z0);
  wallPiece(BW[0], BW[1], BH[1], WH, Z0 - WT, Z0);
  // tường trái (x = X0), ô cửa sổ z -1.75…-0.35
  const LW = [-1.75, -0.35], LH = [0.8, 2.3];
  wallPiece(X0 - WT, X0, -0.02, WH, Z0, LW[0]);
  wallPiece(X0 - WT, X0, -0.02, WH, LW[1], Z1);
  wallPiece(X0 - WT, X0, -0.02, LH[0], LW[0], LW[1]);
  wallPiece(X0 - WT, X0, LH[1], WH, LW[0], LW[1]);
  // chân tường
  mesh(gBox(X1 - X0, .07, .012), M.base, 0, .035, Z0 + .006, shell).castShadow = false;
  mesh(gBox(.012, .07, Z1 - Z0), M.base, X0 + .006, .035, 0, shell).castShadow = false;
  // khung + kính cửa sổ
  const glassMeshes = [];
  function windowFrame(axis, a0, a1, y0, y1, plane) { // axis 'x': ô trên tường sau; 'z': ô trên tường trái
    const f = .05, d = .07, cx = (a0 + a1) / 2, cy = (y0 + y1) / 2, w = a1 - a0, h = y1 - y0;
    const put = (aw, ah, ac, yc) => {
      const g = axis === 'x' ? gBox(aw, ah, d) : gBox(d, ah, aw);
      const m = axis === 'x' ? mesh(g, M.frame, ac, yc, plane, shell) : mesh(g, M.frame, plane, yc, ac, shell);
      return m;
    };
    put(w, f, cx, y0 + f / 2); put(w, f, cx, y1 - f / 2); put(f, h, a0 + f / 2, cy); put(f, h, a1 - f / 2, cy); put(f * .7, h, cx, cy);
    put(w, f * .6, cx, y0 + h * .62);
    const sill = axis === 'x' ? mesh(gBox(w + .1, .035, .16), M.cap, cx, y0 - .017, plane + .06, shell) : mesh(gBox(.16, .035, w + .1), M.cap, plane + .06, y0 - .017, cx, shell);
    sill.castShadow = false;
    const gl = axis === 'x' ? mesh(gBox(w - .04, h - .04, .01), M.glass, cx, cy, plane, shell) : mesh(gBox(.01, h - .04, w - .04), M.glass, plane, cy, cx, shell);
    gl.castShadow = false; gl.receiveShadow = false; glassMeshes.push(gl);
  }
  windowFrame('x', BW[0], BW[1], BH[0], BH[1], Z0 - WT / 2);
  windowFrame('z', LW[0], LW[1], LH[0], LH[1], X0 - WT / 2);
  // mặt bàn đặt mô hình: chỉ nhận bóng
  // bóng mờ dưới đế mô hình (thay cho mặt nhận bóng lớn — đỡ vệt bóng tường kéo dài ra ngoài)
  // v5: phòng lơ lửng giữa thiên hà → bỏ bóng đổ dưới đế; thay bằng quầng sáng mờ (texture cộng màu, không bloom)
  // + một đường viền sáng mảnh màu nhấn quanh mép dưới của đế. Màu = --accent của trang (readAccent).
  const ADD = { transparent: true, depthWrite: false, toneMapped: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
  const haloTex = ctex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,.62)'); gr.addColorStop(.42, 'rgba(255,255,255,.42)'); gr.addColorStop(.72, 'rgba(255,255,255,.11)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, null, false);
  haloTex.wrapS = haloTex.wrapT = THREE.ClampToEdgeWrapping;
  const PL = { x0: -0.075 - 7.75 / 2, x1: -0.075 + 7.75 / 2, z0: -0.075 - 6.15 / 2, z1: -0.075 + 6.15 / 2, yb: -0.18 };
  const haloMat = new THREE.MeshBasicMaterial(Object.assign({ map: haloTex, color: '#ffffff', opacity: .5 }, ADD));
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
  halo.rotation.x = -Math.PI / 2; halo.position.set(-0.075, -0.7, -0.075); halo.scale.set(17, 14.5, 1); halo.raycast = () => {}; scene.add(halo);
  // vệt sáng tràn quanh viền (vòng chữ nhật làm mờ)
  const RW = 512, RH = 408, RP = 44;
  const ringTex = ctex(RW, RH, (g, w, h) => {
    g.filter = 'blur(9px)'; g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 9;
    g.strokeRect(RP, RP, w - 2 * RP, h - 2 * RP); g.filter = 'none';
  }, null, false);
  ringTex.wrapS = ringTex.wrapT = THREE.ClampToEdgeWrapping;
  const ringMat = new THREE.MeshBasicMaterial(Object.assign({ map: ringTex, color: '#ffffff', opacity: .55 }, ADD));
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.set(-0.075, PL.yb - .004, -0.075);
  ring.scale.set(7.75 * RW / (RW - 2 * RP), 6.15 * RH / (RH - 2 * RP), 1); ring.raycast = () => {}; scene.add(ring);
  const rimMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const RT = .022, ry = PL.yb + RT / 2 - .002, o = .004;
  [[PL.x1 - PL.x0 + RT, RT, RT, (PL.x0 + PL.x1) / 2, PL.z1 + o], [PL.x1 - PL.x0 + RT, RT, RT, (PL.x0 + PL.x1) / 2, PL.z0 - o],
   [RT, RT, PL.z1 - PL.z0 + RT, PL.x0 - o, (PL.z0 + PL.z1) / 2], [RT, RT, PL.z1 - PL.z0 + RT, PL.x1 + o, (PL.z0 + PL.z1) / 2]].forEach(([w, h, d, x, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rimMat); m.position.set(x, ry, z); m.raycast = () => {}; scene.add(m);
  });

  // ───────── đồ nội thất ─────────
  const items = {};            // id → { id, data, root, base: Vector3, zone: Material, ... }
  function makeItem(id, data, build, pos, rotY, wall) {
    const root = new THREE.Group();
    root.userData.item = id;
    const zone = data ? zoneMat(data.mat) : null;
    build(root, zone);
    root.position.set(pos[0], pos[1], pos[2]); root.rotation.y = rotY || 0;
    scene.add(root);
    const it = { id, data, root, zone, mat: data ? data.mat : null, base: new THREE.Vector3(pos[0], pos[1], pos[2]), wall: wall || null };
    items[id] = it;
    return it;
  }
  const D = Object.fromEntries(ITEMS.map((d) => [d.id, d]));

  // Thảm
  makeItem('rug', D.rug, (g, z) => { const m = mesh(gBox(2.8, .012, 2.0), z, 0, .006, 0, g); m.castShadow = false; }, [-1.75, 0, -1.2]);
  // Sofa
  makeItem('sofa', D.sofa, (g, z) => {
    [[-.98, -.38], [.98, -.38], [-.98, .38], [.98, .38]].forEach(([x, zz]) => mesh(gCyl(.025, .02, .07, 10), M.wood, x, .035, zz, g, { noOutline: true }));
    mesh(gRBox(2.1, .2, .9, .035), z, 0, .17, 0, g);
    [-.62, 0, .62].forEach((x) => mesh(gRBox(.6, .15, .66, .05), z, x, .345, .08, g));
    [-.62, 0, .62].forEach((x) => mesh(gRBox(.6, .42, .2, .07), z, x, .53, -.3, g, { rx: -.12 }));
    [-.965, .965].forEach((x) => mesh(gRBox(.17, .5, .9, .06), z, x, .32, 0, g));
    mesh(gRBox(.4, .34, .12, .05), M.pillow, .58, .58, -.14, g, { rx: -.15, rz: .12 });
  }, [-1.75, 0, -2.3]);
  // Ghế bành: mẫu A (vuông, thả xuống trước) → mẫu B (tròn, thay ở mốc 05)
  const armVar = {};
  const armIt = makeItem('arm', D.arm, (g, z) => {
    const a = new THREE.Group(); a.name = 'A'; g.add(a);
    [[-.34, -.32], [.34, -.32], [-.34, .32], [.34, .32]].forEach(([x, zz]) => mesh(gCyl(.02, .016, .1, 10), M.wood, x, .05, zz, a, { noOutline: true }));
    mesh(gRBox(.84, .2, .8, .035), z, 0, .2, 0, a);
    mesh(gRBox(.56, .14, .6, .05), z, 0, .37, .06, a);
    mesh(gRBox(.56, .42, .18, .06), z, 0, .55, -.29, a, { rx: -.12 });
    [-.35, .35].forEach((x) => mesh(gRBox(.14, .42, .8, .05), z, x, .31, 0, a));
    const b = new THREE.Group(); b.name = 'B'; g.add(b);
    for (let k = 0; k < 4; k++) { const an = (45 + k * 90) * DEG; mesh(gCyl(.018, .012, .12, 10), M.wood, Math.cos(an) * .28, .06, Math.sin(an) * .28, b, { noOutline: true }); }
    mesh(gCyl(.4, .38, .2, 36), z, 0, .21, 0, b);
    mesh(G('armCush', () => new RoundedBoxGeometry(.6, .1, .6, 2, .05)), z, 0, .35, .03, b);
    const sh = new THREE.Shape();
    const a0 = -20 * DEG, a1 = 200 * DEG, ro = .43, ri = .33;
    sh.absarc(0, 0, ro, a0, a1, false); sh.absarc(0, 0, ri, a1, a0, true);
    const back = G('armBack', () => { const eg = new THREE.ExtrudeGeometry(sh, { depth: .38, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 28 }); eg.rotateX(-Math.PI / 2); return eg; });
    mesh(back, z, 0, .29, 0, b);
    armVar.A = a; armVar.B = b;
  }, [-0.15, 0, -0.95], -72 * DEG);
  // Bàn trà
  makeItem('coffee', D.coffee, (g, z) => {
    mesh(gCyl(.45, .45, .04, 48), z, 0, .4, 0, g);
    for (let k = 0; k < 3; k++) { const an = (90 + k * 120) * DEG; mesh(gCyl(.017, .013, .38, 10), M.metal, Math.cos(an) * .3, .19, Math.sin(an) * .3, g, { noOutline: true }); }
  }, [-1.75, .012, -1.15]);
  // Đèn cây
  const lampIt = makeItem('lamp', D.lamp, (g, z) => {
    mesh(gCyl(.15, .16, .03, 32), M.metal, 0, .015, 0, g);
    mesh(gCyl(.012, .012, 1.42, 10), M.metal, 0, .74, 0, g);
    z.side = THREE.DoubleSide;
    mesh(gCyl(.16, .23, .3, 36, true), z, 0, 1.42, 0, g);
    mesh(G('bulb', () => new THREE.SphereGeometry(.05, 16, 10)), M.bulb, 0, 1.36, 0, g, { noShadow: true, noOutline: true });
  }, [-3.15, 0, -2.4]);
  // Kệ sách mở (sát tường trái, quay ra +x)
  makeItem('shelf', D.shelf, (g, z) => {
    [-.635, .635].forEach((x) => mesh(gBox(.03, 1.9, .34), z, x, .95, 0, g));
    [.04, .48, .92, 1.36, 1.8].forEach((y) => mesh(gBox(1.24, .025, .34), z, 0, y, 0, g));
    mesh(gBox(1.3, .025, .34), z, 0, 1.888, 0, g);
    const books = (y, x0, n, seed) => { const r = rng(seed); let x = x0; for (let i = 0; i < n; i++) { const w = .03 + r() * .025, h = .2 + r() * .09; mesh(gBox(+w.toFixed(3), +h.toFixed(3), .22), bookCols[Math.floor(r() * bookCols.length)], x + w / 2, y + h / 2, .02, g, { noOutline: true }); x += w + .004; } };
    books(.4925, -.58, 9, 3); books(1.3725, .05, 7, 9); books(.0525, -.2, 6, 5);
    mesh(gCyl(.07, .055, .24, 20), vase, .38, .4925 + .12, .02, g, { noOutline: true });
    mesh(gCyl(.15, .13, .2, 24), basket, -.35, .9325 + .1, .02, g, { noOutline: true });
    mesh(gBox(.26, .16, .22), bookCols[2], .3, .9325 + .08, .02, g, { noOutline: true });
    mesh(gCyl(.06, .06, .14, 18), vase, -.4, 1.8125 + .07, .02, g, { noOutline: true });
  }, [-3.41, 0, 1.0], 90 * DEG);
  // Chậu cây
  makeItem('plant', D.plant, (g, z) => {
    mesh(gCyl(.2, .15, .38, 28), z, 0, .19, 0, g);
    mesh(gCyl(.185, .185, .02, 24), M.soil, 0, .37, 0, g, { noOutline: true });
    mesh(gCyl(.012, .012, .7, 8), M.wood, 0, .7, 0, g, { noOutline: true });
    const r = rng(42); const lg = G('leaf', () => new THREE.IcosahedronGeometry(.17, 0));
    for (let i = 0; i < 11; i++) {
      const an = i * 2.4, rad = .08 + r() * .14, y = .62 + i * .06 + r() * .05;
      const m = mesh(lg, i % 2 ? M.leaf : M.leaf2, Math.cos(an) * rad, y, Math.sin(an) * rad, g, { noOutline: true });
      m.scale.set(1, .42, .62); m.rotation.set(r() * .8, an, .5 + r() * .5);
    }
  }, [-3.12, 0, 2.25]);
  // Tranh treo tường (gốc ở mặt tường, +z ra khỏi tường)
  makeItem('art', D.art, (g, z) => {
    mesh(gBox(1.12, .78, .035), M.artFrame, 0, 0, .0175, g);
    const c = mesh(gBox(1.02, .68, .006), z, 0, 0, .037, g); c.castShadow = false;
  }, [-1.75, 1.62, Z0], 0, { n: new THREE.Vector3(0, 0, 1) });
  // Bàn ăn + 4 ghế
  makeItem('dtable', D.dtable, (g, z) => {
    mesh(gRBox(1.6, .045, .9, .012), z, 0, .7375, 0, g);
    [[-.72, -.36], [.72, -.36], [-.72, .36], [.72, .36]].forEach(([x, zz]) => mesh(gBox(.05, .715, .05), M.metal, x, .3575, zz, g, { noOutline: true }));
  }, [1.85, 0, -1.0]);
  const chairData = Object.assign({}, D.chair1);
  function chairBuild(g, z) {
    [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]].forEach(([x, zz]) => mesh(gBox(.032, .43, .032), z, x, .215, zz, g));
    mesh(gRBox(.44, .04, .44, .012), z, 0, .45, 0, g);
    mesh(gRBox(.4, .035, .4, .012), M.cushion, 0, .4875, .01, g, { noOutline: true });
    [-.19, .19].forEach((x) => mesh(gBox(.032, .42, .032), z, x, .66, -.19, g));
    mesh(gRBox(.44, .14, .03, .012), z, 0, .8, -.19, g);
  }
  makeItem('chair1', D.chair1, chairBuild, [1.45, 0, -1.62], 0);
  makeItem('chair2', chairData, chairBuild, [2.25, 0, -1.62], 0);
  makeItem('chair3', chairData, chairBuild, [1.45, 0, -0.38], 180 * DEG);
  makeItem('chair4', chairData, chairBuild, [2.25, 0, -0.38], 180 * DEG);
  // Đèn tường (phải cửa sổ sau)
  const sconceIt = makeItem('sconce', D.sconce, (g, z) => {
    mesh(gCyl(.06, .06, .02, 24), M.metal, 0, 0, .01, g, { rx: Math.PI / 2 });
    mesh(gBox(.015, .015, .16), M.metal, 0, 0, .09, g);
    z.side = THREE.DoubleSide;
    mesh(gCyl(.07, .1, .14, 28, true), z, 0, .02, .18, g);
    mesh(G('bulbS', () => new THREE.SphereGeometry(.03, 12, 8)), M.bulb, 0, -.01, .18, g, { noShadow: true, noOutline: true });
  }, [3.24, 1.78, Z0], 0, { n: new THREE.Vector3(0, 0, 1) });

  // Kích thước + bóng mờ dưới chân + "bóng" khi kéo thả (ghost)
  const ghostMat = new THREE.MeshBasicMaterial({ map: ghostTex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const tmpBox = new THREE.Box3();
  Object.values(items).forEach((it) => {
    const r = it.root, p = r.position.clone(), ry = r.rotation.y;
    r.position.set(0, 0, 0); r.rotation.y = 0; r.updateMatrixWorld(true);
    if (it.id === 'arm') armVar.B.visible = false;
    tmpBox.setFromObject(r); const size = tmpBox.getSize(new THREE.Vector3()); const ctr = tmpBox.getCenter(new THREE.Vector3());
    if (it.id === 'arm') armVar.B.visible = true;
    r.position.copy(p); r.rotation.y = ry; r.updateMatrixWorld(true);
    it.size = size; it.ctr = ctr;
    const gm = new THREE.Mesh(G('plane1', () => new THREE.PlaneGeometry(1, 1)), ghostMat.clone());
    gm.renderOrder = 3; gm.visible = false; gm.raycast = () => {};
    if (it.wall) { gm.scale.set(size.x + .08, size.y + .08, 1); gm.position.set(p.x + ctr.x, p.y + ctr.y, p.z + .004); }
    else { gm.rotation.set(-Math.PI / 2, 0, -ry); gm.scale.set(size.x + .08, size.z + .08, 1); gm.position.set(p.x, p.y + .016, p.z); }
    scene.add(gm); it.ghost = gm;
    if (!it.wall && it.id !== 'rug') {
      const bm = new THREE.Mesh(G('plane1', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: .5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      bm.rotation.set(-Math.PI / 2, 0, -ry); bm.scale.set(size.x * 1.25 + .1, size.z * 1.25 + .1, 1); bm.position.set(p.x, p.y + .008, p.z);
      bm.raycast = () => {}; bm.renderOrder = 1; scene.add(bm); it.blob = bm;
    }
  });
  armVar.B.visible = true; armVar.A.visible = false;

  // ───────── đèn: Ngày ↔ Đêm (đổi cường độ, không thêm / bớt đèn → không biên dịch lại shader) ─────────
  const hemi = new THREE.HemisphereLight('#FFF3E2', '#6A5A4A', .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF0DA', 3.2);
  sun.position.set(-8.5, 7.2, 3.2); sun.target.position.set(0, 0, -0.4); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6.5, right: 6.5, top: 6.5, bottom: -6.5, near: 2, far: 26 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = .025; sun.shadow.radius = 3;
  const lampL = new THREE.PointLight('#FFB46E', 0, 0, 2); lampL.position.set(-3.15, 1.36, -2.4); scene.add(lampL);
  const sconL = new THREE.PointLight('#FFB46E', 0, 0, 2); sconL.position.set(3.24, 1.77, Z0 + .22); scene.add(sconL);
  const LIGHT = {
    ngay: { hemi: .85, hemiSky: '#FFF3E2', hemiGnd: '#6A5A4A', sun: 3.6, sunCol: '#FFEFD6', lamp: 0, scon: 0, env: .5, glassE: .55, glassCol: '#E3EEF6', glassOp: .45, bulb: 0, shade: 0, exp: .96, halo: .6 },
    // đêm: kính gần trong → nhìn qua cửa sổ thấy trời sao của trang (canvas trong suốt phía sau)
    dem:  { hemi: .16, hemiSky: '#6F81AA', hemiGnd: '#1C1916', sun: .42, sunCol: '#9DB3DE', lamp: 7.5, scon: 3.2, env: .1,  glassE: .22, glassCol: '#1A2238', glassOp: .14, bulb: 4, shade: 1.4, exp: 1.12, halo: 1 },
  };
  let timeOfDay = 'dem', lightK = 1, lightFrom = 1, lightTo = 1, lightT0 = 0, lightAnim = false;   // v5: mặc định Đêm
  const cA = new THREE.Color(), cB = new THREE.Color();
  function applyLight(k) { // 0 = ngày, 1 = đêm
    const a = LIGHT.ngay, b = LIGHT.dem, L = (x, y) => x + (y - x) * k;
    hemi.intensity = L(a.hemi, b.hemi); hemi.color.copy(cA.set(a.hemiSky)).lerp(cB.set(b.hemiSky), k); hemi.groundColor.copy(cA.set(a.hemiGnd)).lerp(cB.set(b.hemiGnd), k);
    sun.intensity = L(a.sun, b.sun); sun.color.copy(cA.set(a.sunCol)).lerp(cB.set(b.sunCol), k);
    lampL.intensity = L(a.lamp, b.lamp);
    sconL.intensity = L(a.scon, b.scon);
    M.glass.emissive.copy(cA.set(a.glassCol)).lerp(cB.set(b.glassCol), k); M.glass.emissiveIntensity = L(a.glassE, b.glassE); M.glass.opacity = L(a.glassOp, b.glassOp);
    M.bulb.emissiveIntensity = L(a.bulb, b.bulb);
    [items.lamp, items.sconce].forEach((it) => { it.zone.emissive.set('#FFC88A'); it.zone.emissiveIntensity = L(a.shade, b.shade) * (MATS[it.mat].glow ?? 0); });
    const env = L(a.env, b.env); allMats.forEach((m) => { m.envMapIntensity = env; });
    renderer.toneMappingExposure = L(a.exp, b.exp);
    haloMat.opacity = L(a.halo, b.halo); ringMat.opacity = .35 + .25 * k;
  }
  applyLight(lightK);

  // ───────── viền sáng khi chọn: đánh dấu bóng món đồ vào stencil, rồi vẽ bản nới rộng ~2,5 px ở ngoài vùng đánh dấu ─────────
  // (độ dày cố định theo pixel, luôn thấy kể cả khi bị món khác che — giống viền chọn trong trình dựng cảnh)
  const accentCol = new THREE.Color();
  const outlineMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: accentCol }, uPx: { value: 2.6 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `attribute vec3 oNormal; uniform float uPx; uniform vec2 uRes;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * oNormal);
        vec2 d = (projectionMatrix * vec4(n, 0.0)).xy;
        float l = length(d);
        if (l > 1e-5) d /= l;
        clip.xy += d * uPx * 2.0 / uRes * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: `uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    depthTest: false, depthWrite: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  });
  const maskMat = new THREE.MeshBasicMaterial({
    colorWrite: false, depthTest: false, depthWrite: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc,
    stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp,
  });
  function outlineNormals(geo) {
    if (geo.getAttribute('oNormal')) return;
    const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal');
    const acc = new Map(), keys = new Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
      keys[i] = k; const v = acc.get(k) || [0, 0, 0];
      v[0] += nor.getX(i); v[1] += nor.getY(i); v[2] += nor.getZ(i); acc.set(k, v);
    }
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const v = acc.get(keys[i]); const l = Math.hypot(v[0], v[1], v[2]) || 1; arr[i * 3] = v[0] / l; arr[i * 3 + 1] = v[1] / l; arr[i * 3 + 2] = v[2] / l; }
    geo.setAttribute('oNormal', new THREE.BufferAttribute(arr, 3));
  }
  function hullsOf(it) {
    if (it.hulls) return it.hulls;
    it.hulls = [];
    it.root.traverse((o) => {
      if (!o.isMesh || o.userData.noOutline || o.userData.isHull) return;
      outlineNormals(o.geometry);
      const mk = new THREE.Mesh(o.geometry, maskMat); mk.userData.isHull = true; mk.raycast = () => {}; mk.visible = false; mk.renderOrder = 7;
      const h = new THREE.Mesh(o.geometry, outlineMat); h.userData.isHull = true; h.raycast = () => {}; h.visible = false; h.renderOrder = 8;
      o.add(mk, h); it.hulls.push(mk, h);
    });
    return it.hulls;
  }
  Object.values(items).forEach(hullsOf);   // dựng sẵn trước lần vẽ đầu (thêm thuộc tính hình học sau khi đã vẽ dễ lỗi gắn VAO)
  let outlined = new Set();
  function setOutlined(ids) {
    const next = new Set(ids);
    let changed = next.size !== outlined.size;
    outlined.forEach((id) => { if (!next.has(id)) { changed = true; hullsOf(items[id]).forEach((h) => { h.visible = false; }); } });
    next.forEach((id) => { if (!outlined.has(id)) { changed = true; hullsOf(items[id]).forEach((h) => { h.visible = true; }); } });
    outlined = next;
    return changed;
  }

  // ───────── gizmo 3 trục (mốc 03) ─────────
  const gizmo = new THREE.Group(); gizmo.visible = false; scene.add(gizmo);
  const gzMat = (c) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, toneMapped: false });
  const axMats = { x: gzMat('#E5484D'), y: gzMat('#46A758'), z: gzMat('#3E8CE5') };
  const shaftG = new THREE.CylinderGeometry(.013, .013, .46, 10), headG = new THREE.ConeGeometry(.045, .12, 16);
  [['x', [0, 0, -Math.PI / 2]], ['y', [0, 0, 0]], ['z', [Math.PI / 2, 0, 0]]].forEach(([k, r]) => {
    const a = new THREE.Group(); a.rotation.set(r[0], r[1], r[2]);
    const s = new THREE.Mesh(shaftG, axMats[k]); s.position.y = .23; const h = new THREE.Mesh(headG, axMats[k]); h.position.y = .5;
    a.add(s, h); a.traverse((o) => { o.renderOrder = 10; o.raycast = () => {}; }); gizmo.add(a);
  });
  const gzBall = new THREE.Mesh(new THREE.SphereGeometry(.04, 14, 10), gzMat('#FFFFFF')); gzBall.renderOrder = 10; gizmo.add(gzBall);

  // ───────── khung nhóm (mốc 04, 07) ─────────
  const gbox = new THREE.Box3();
  DINING.forEach((id) => { items[id].root.updateMatrixWorld(true); gbox.expandByObject(items[id].root); });
  gbox.expandByScalar(.07); gbox.min.y = .005;
  const gSize = gbox.getSize(new THREE.Vector3()), gCtr = gbox.getCenter(new THREE.Vector3());
  const frameMat = new THREE.LineDashedMaterial({ color: accentCol, dashSize: .12, gapSize: .07, transparent: true, depthTest: false, toneMapped: false });
  const groupFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(gSize.x, gSize.y, gSize.z)), frameMat);
  groupFrame.position.copy(gCtr); groupFrame.computeLineDistances(); groupFrame.renderOrder = 9; groupFrame.visible = false; scene.add(groupFrame);
  const glabelAnchor = new THREE.Vector3(gCtr.x, gbox.max.y + .02, gbox.max.z);

  function readAccent() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#A396FF';
    accentCol.setStyle(v, THREE.LinearSRGBColorSpace);   // viền (ShaderMaterial, không đổi không gian màu) → giữ nguyên mã màu
    frameMat.color.setStyle(v);                            // vật liệu dựng sẵn: đổi sRGB → tuyến tính, ra màn hình đúng mã màu
    Object.values(items).forEach((it) => { if (it.ghost) it.ghost.material.color.setStyle(v); });
    rimMat.color.setStyle(v); ringMat.color.setStyle(v);
    haloMat.color.setStyle(v).lerp(cB.set('#9AA6FF'), .35);   // quầng ngả lạnh một chút cho hợp nền thiên hà
  }
  readAccent();
  new MutationObserver(() => { readAccent(); invalidate(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-accent'] });

  // ───────── camera + điều khiển ─────────
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .085;
  controls.rotateSpeed = .5; controls.zoomSpeed = .8; controls.panSpeed = .7; controls.screenSpacePanning = true;
  controls.minAzimuthAngle = -35 * DEG; controls.maxAzimuthAngle = 125 * DEG;   // luôn nhìn từ phía mở của phòng, không ra sau tường
  controls.minDistance = 2.2; controls.maxDistance = 42;
  controls.minPolarAngle = 0; controls.maxPolarAngle = 78 * DEG;   // không chui xuống dưới sàn
  controls.enableZoom = false;                                       // chỉ bật khi đã bấm vào khung / giữ Ctrl
  const TB = { min: new THREE.Vector3(-3.6, 0, -2.8), max: new THREE.Vector3(3.6, 1.6, 2.8) };
  controls.addEventListener('change', () => { controls.target.clamp(TB.min, TB.max); invalidate(); });
  controls.addEventListener('start', () => { if (fly !== 'done') endFly(); tween = null; userMoved(); kick(); });

  const vTmp = new THREE.Vector3();
  function viewPose(name) {
    const v = VIEWS[name], aspect = camera.aspect;
    const vf = camera.fov * DEG, hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    let dist = v.dist;
    const fitW = v.fitW * (aspect < 1 ? .74 : 1);   // điện thoại dọc: cho cắt 2 mép một chút, phòng đỡ nhỏ
    dist = Math.max(dist, (fitW / 2) / Math.tan(hf / 2));
    if (v.fitH) dist = Math.max(dist, (v.fitH / 2) / Math.tan(vf / 2));
    const dir = vTmp.set(v.dir[0], v.dir[1], v.dir[2]).normalize();
    const target = new THREE.Vector3(v.target[0], v.target[1] + (aspect < 1 && v.mobDy ? v.mobDy : 0), v.target[2]);
    return { pos: target.clone().addScaledVector(dir, dist), target };
  }
  let tween = null, curView = 'toan';
  function goView(name, instant) {
    curView = name;
    stage.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x.getAttribute('data-view') === name)));
    const p = viewPose(name);
    controls.enableDamping = false; controls.update(); controls.enableDamping = true;   // bỏ quán tính còn dư
    if (instant || reduced()) { camera.position.copy(p.pos); controls.target.copy(p.target); controls.update(); tween = null; invalidate(); return; }
    tween = { t0: performance.now(), dur: 1100, p0: camera.position.clone(), q0: controls.target.clone(), p1: p.pos, q1: p.target };
    kick();
  }
  function stepTween(now) {
    const k = (tween.ease || easeInOut)((now - tween.t0) / tween.dur);
    // đi theo cung (nội suy hướng nhìn + khoảng cách) để camera không cắt qua tường
    const o0 = vTmp.copy(tween.p0).sub(tween.q0), o1 = tween.p1.clone().sub(tween.q1);
    const r = THREE.MathUtils.lerp(o0.length(), o1.length(), k);
    const d = o0.normalize().lerp(o1.normalize(), k).normalize();
    controls.target.copy(tween.q0).lerp(tween.q1, k);
    camera.position.copy(controls.target).addScaledVector(d, r);
    controls.update();
    if (k >= 1) { if (tween.fly) { fly = 'done'; controls.maxDistance = MAX_DIST; } tween = null; }
  }

  // ───────── bay vào lần đầu (≈2,5 s, từ xa + cao + lệch góc tới "Toàn cảnh") ─────────
  // Bắt đầu khi khối hiện ≥ 45 % trên màn hình. Bất kỳ thao tác nào trong khung → nhảy tới cuối. Giảm chuyển động → không bay.
  const MAX_DIST = 42;
  let fly = opt.flyIn && !reduced() ? 'wait' : 'done';
  function setPose(p) { camera.position.copy(p.pos); controls.target.copy(p.target); controls.enableDamping = false; controls.update(); controls.enableDamping = true; invalidate(); }
  function flyFrom() {
    const p = viewPose('toan');
    const sph = new THREE.Spherical().setFromVector3(p.pos.clone().sub(p.target));
    sph.radius *= 2.5; sph.theta = Math.min(sph.theta + 46 * DEG, 118 * DEG); sph.phi = Math.max(sph.phi - 16 * DEG, 24 * DEG);
    const target = p.target.clone().add(new THREE.Vector3(0, 1.1, 0));
    return { pos: target.clone().add(new THREE.Vector3().setFromSpherical(sph)), target };
  }
  function startFly() {
    if (fly !== 'wait') return;
    fly = 'flying';
    const p = viewPose('toan');
    tween = { t0: performance.now(), dur: 2500, p0: camera.position.clone(), q0: controls.target.clone(), p1: p.pos, q1: p.target, ease: easeInOut, fly: true };
    kick();
  }
  function endFly() {
    if (fly === 'done') return;
    fly = 'done'; controls.maxDistance = MAX_DIST;
    if (tween && tween.fly) tween = null;
    setPose(viewPose('toan'));
  }

  // ───────── dòng thời gian "Dựng phòng" ─────────
  let tl = T_END, playing = false, mode = 'free', lastApplied = -1, stepIdx = -1, stepHold = 0;
  const lerpMat = (mat, k1, k2, k) => { const a = MATS[k1], b = MATS[k2]; mat.color.copy(cA.set(a.color)).lerp(cB.set(b.color), k); mat.roughness = a.rough + (b.rough - a.rough) * k; };
  function dropState(t) {
    let last = null;
    DROPS.forEach(([id, t0]) => {
      const it = items[id], k = (t - t0) / DROP_DUR;
      it.root.visible = k >= 0;
      // ghost hiện trước khi thả 0,18 s, mờ dần khi đồ chạm chỗ
      const gk = (t - (t0 - .18)) / (DROP_DUR + .3);
      const gOn = mode === 'tl' && gk > 0 && gk < 1;
      it.ghost.visible = gOn; if (gOn) it.ghost.material.opacity = gk < .25 ? gk / .25 : 1 - smooth((gk - .55) / .45);
      const p = clamp01(k);
      if (it.wall) {
        const d = .8 * (1 - easeOutCubic(p));
        it.root.position.copy(it.base).addScaledVector(it.wall.n, d);
      } else {
        it.root.position.copy(it.base); it.root.position.y = it.base.y + 1.0 * dropCurve(p);
      }
      if (it.blob) { it.blob.visible = k >= -.2; it.blob.material.opacity = .5 * clamp01(1 - (it.root.position.y - it.base.y) / 1.0) * clamp01((k + .2) / .4); }
      if (k >= 0 && k < 1.2) last = it;
    });
    return last;
  }
  function armOffset(t) { // 03: nhích -X 3 bước lưới 10 cm
    const s = (x) => easeOutCubic(x / .14);
    return .3 - .1 * (s(t - 6.0) + s(t - 6.35) + s(t - 6.7));
  }
  function applyTimeline(t, force) {
    if (!force && Math.abs(t - lastApplied) < 1e-4) return;
    lastApplied = t;
    const tlMode = mode === 'tl';
    const dropping = dropState(t);
    // ghế bành: lệch +X lúc thả, nhích về ở 03; đổi mẫu A → B ở 05
    const ax = armOffset(t), arm = items.arm;
    arm.root.position.x = arm.base.x + ax;
    arm.blob.position.x = arm.root.position.x; arm.ghost.position.x = arm.base.x + .3;
    const sA = 1 - smooth((t - 9.05) / .15), sB = t < 9.15 ? 0 : Math.max(.001, easeOutBack((t - 9.15) / .3));
    armVar.A.visible = sA > .001; armVar.A.scale.setScalar(Math.max(sA, .001));
    armVar.B.visible = t >= 9.15; armVar.B.scale.setScalar(sB);
    arm.variant = t >= 9.15 ? 'B' : 'A';
    // sofa: đổi vật liệu vải bọc ở 06
    if (tlMode || !items.sofa.userSet) {   // ngoài dòng thời gian thì giữ vật liệu người xem đã chọn
      const sk = smooth((t - 10.5) / .4);
      items.sofa.zone.map = weaveTex; items.sofa.zone.metalness = 0;
      lerpMat(items.sofa.zone, 'lanh-xam', 'xanh-reu', sk);
      items.sofa.mat = sk >= .5 ? 'xanh-reu' : 'lanh-xam';
    }
    // viền sáng theo mốc
    let ol = [];
    if (tlMode) {
      if (t >= 5.7 && t < 7.2) ol = ['arm'];
      else if (t >= 7.3 && t < 8.6) ol = DINING;
      else if (t >= 8.7 && t < 10.0) ol = ['arm'];
      else if (t >= 10.1 && t < 11.4) ol = ['sofa'];
      else if (t >= 11.5 && t < 12.5) ol = DINING;
    } else if (sel) ol = [sel];
    setOutlined(ol);
    // gizmo
    const gOn = tlMode && t >= 5.75 && t < 7.1;
    gizmo.visible = gOn;
    if (gOn) {
      gizmo.position.set(arm.root.position.x, .92, arm.root.position.z);
      const hot = t >= 5.95 && t < 6.95;
      axMats.x.color.set(hot ? '#FFD34D' : '#E5484D');
      gizmo.userData.k = .85 + .15 * smooth((t - 5.75) / .2);
    }
    // khung nhóm
    const fOn = tlMode && t >= 7.75;
    groupFrame.visible = fOn;
    if (fOn) { const k = smooth((t - 7.75) / .3); frameMat.opacity = k; groupFrame.scale.setScalar(1.05 - .05 * k); }
    renderer.shadowMap.needsUpdate = true;
    // chữ trên khung
    setOverlay(t, tlMode, dropping);
    invalidate();
  }
  let ovState = {};
  function setOverlay(t, tlMode, dropping) {
    const s = {};
    s.glabel = tlMode && t >= 7.9 ? (t >= 11.7 ? 'combo' : 'nhom') : '';
    let kho = '';
    if (tlMode) { if (t >= .9 && t < 5.6) kho = 'do'; else if (t >= 10.05 && t < 11.35) kho = 'vl'; else if (t >= 11.5 && t < 12.5) kho = 'cb'; }
    s.kho = kho;
    s.khoItem = kho === 'do' ? (dropping ? itemName(dropping.id) : (t < 2.05 ? 'Chọn món…' : '')) : kho === 'vl' ? 'Vải xanh rêu' : kho === 'cb' ? 'Bàn ăn 4 ghế' : '';
    if (s.glabel !== ovState.glabel) {
      ui.glabel.classList.toggle('is-on', !!s.glabel);
      if (s.glabel) ui.glabel.innerHTML = s.glabel === 'combo' ? '<b>Combo</b> · Bàn ăn 4 ghế' : '<b>Nhóm</b> · Bàn ăn';
    }
    if (s.kho !== ovState.kho) {
      ui.kho.classList.toggle('is-on', !!s.kho);
      if (s.kho) ui.kho.querySelectorAll('[data-k]').forEach((e) => e.classList.toggle('is-on', e.getAttribute('data-k') === s.kho));
    }
    if (s.khoItem !== ovState.khoItem) ui.khoItem.textContent = s.khoItem;
    ovState = s;
  }
  const itemName = (id) => id === 'arm' ? (items.arm.variant === 'B' ? 'Ghế bành tròn' : 'Ghế bành vuông') : (items[id].data.name);
  function mocIndex(t) { let k = 0; for (let i = 0; i < MOC.length; i++) if (t >= MOC[i].t - 1e-6) k = i; return k; }
  let lastMoc = -1, lastSub = '', lastP = -1;
  function updateTlUi() {
    const k = mocIndex(tl);
    let m = MOC[k], sub = m.sub;
    const done = mode === 'free' && !playing && tl >= T_END;
    if (k === 2) { const d = DROPS.filter(([, t0]) => tl >= t0).pop(); const it = d ? items[d[0]] : null; sub = it ? `${itemName(it.id)} ${it.wall ? 'áp vào tường' : 'thả xuống, bám sàn'}` : 'Kéo từng món ra phòng'; }
    if (done) { m = { no: '', name: 'Phòng mẫu đã dựng xong' }; sub = 'Xem lại từ phòng trống, qua 8 thao tác'; }
    if (k !== lastMoc || sub !== lastSub || m.name !== ui.mocName.textContent) {
      ui.mocNo.textContent = m.no ? `${m.no} / 08` : (done ? '' : '00 / 08');
      ui.mocName.textContent = m.name;
      ui.mocSub.textContent = sub;
      ui.ticks.querySelectorAll('.xt-tick').forEach((e, i) => e.classList.toggle('is-on', i + 1 <= k));
      lastMoc = k; lastSub = sub;
    }
    const p = tl / T_END;
    if (Math.abs(p - lastP) > 1e-4) {
      ui.range.value = String(Math.round(tl * 100));
      ui.range.style.setProperty('--p', (p * 100).toFixed(2) + '%');
      ui.range.setAttribute('aria-valuetext', `${m.no ? m.no + ' / 08 · ' : ''}${m.name} — ${fmt(tl)} / ${fmt(T_END)}`);
      ui.time.textContent = `${fmt(tl)} / ${fmt(T_END)}`;
      lastP = p;
    }
    const state = playing ? 'pause' : (tl >= T_END && mode === 'tl') ? 'replay' : 'play';
    if (ui.play.getAttribute('data-state') !== state) {
      ui.play.setAttribute('data-state', state);
      ui.playTxt.textContent = state === 'pause' ? 'Tạm dừng' : state === 'replay' ? 'Phát lại' : 'Dựng phòng';
      ui.play.setAttribute('aria-label', state === 'pause' ? 'Tạm dừng dựng phòng' : state === 'replay' ? 'Phát lại: dựng phòng từ đầu' : 'Phát: dựng phòng từ phòng trống');
    }
    emitLive();
  }
  // ───────── báo trạng thái cho island của trang (thay thông báo "Đã lưu phòng" trong khung) ─────────
  let liveKey = '';
  const cardName = (id) => id === 'arm' ? itemName('arm') : (EXTRA_CHAIRS.includes(id) || id === 'chair1') ? 'Ghế ăn' : items[id].data.name;
  function emitLive() {
    if (!opt.onLive) return;
    let s;
    if (mode === 'tl' && (playing || tl < T_END - 1e-3)) { const m = MOC[mocIndex(tl)]; s = { kind: 'step', no: m.no || '00', name: m.name, p: tl / T_END, playing }; }
    else if (sel) { const mt = MATS[items[sel].mat]; s = { kind: 'sel', name: cardName(sel), mat: mt.name, sw: mt.sw }; }
    else s = { kind: 'none' };
    const key = [s.kind, s.no, s.name, s.mat, s.playing].join('|');
    if (key === liveKey && s.kind !== 'step') return;
    liveKey = key; opt.onLive(s);
  }
  function playEnded() { if (opt.onLive) opt.onLive({ kind: 'saved' }); }
  // vạch mốc trên thanh thời gian
  MOC.slice(1).forEach((m) => {
    const s = document.createElement('span'); s.className = 'xt-tick';
    s.style.setProperty('--x', (m.t / T_END).toFixed(4)); s.innerHTML = `<i></i><b>${m.no}</b>`; s.title = m.name;
    ui.ticks.appendChild(s);
  });
  ui.range.max = String(Math.round(T_END * 100));

  function enterTl() {
    if (mode !== 'tl') { mode = 'tl'; select(null); stage.classList.add('is-tl'); items.sofa.userSet = false; matAnim = null; }
  }
  function play() {
    enterTl();
    const fresh = tl >= T_END - 1e-3;
    if (fresh) { tl = 0; stepIdx = 0; goView('toan'); }
    playing = true; stepHold = performance.now(); lastFrame = 0;
    if (reduced() && !fresh) { stepIdx = MOC_RESULT.findIndex((x) => x > tl + 1e-3); if (stepIdx < 0) stepIdx = MOC_RESULT.length - 1; tl = MOC_RESULT[stepIdx]; }
    applyTimeline(tl, true); updateTlUi(); kick();
  }
  function pause() { playing = false; updateTlUi(); }
  ui.play.addEventListener('click', () => { if (playing) pause(); else play(); });
  ui.range.addEventListener('input', () => {
    enterTl(); playing = false;
    tl = Math.min(T_END, Math.max(0, (+ui.range.value) / 100));
    applyTimeline(tl); updateTlUi();
  });

  // ───────── chọn món + thẻ ─────────
  let sel = null;
  const ORDER = ITEMS.map((d) => d.id);
  const keyOf = (id) => EXTRA_CHAIRS.includes(id) ? 'chair1' : id;
  function select(id) {
    if (id === sel) return;
    sel = id;
    if (id && mode === 'tl') { mode = 'free'; stage.classList.remove('is-tl'); playing = false; applyTimeline(tl, true); }
    setOutlined(id ? [id] : []);
    if (id) fillCard();
    ui.card.classList.toggle('is-open', !!id);
    ui.card.setAttribute('aria-hidden', id ? 'false' : 'true');
    if ('inert' in ui.card) ui.card.inert = !id;
    stage.classList.toggle('has-card', !!id);
    updateViewOffset();
    updateTlUi(); invalidate();
  }
  // Điện thoại: tấm trượt che nửa dưới → đẩy hình phòng lên nửa trên để vẫn thấy món đang chọn
  function updateViewOffset() {
    const w = stage.clientWidth, h = stage.clientHeight;
    const off = sel && w < 768 ? Math.round(ui.card.offsetHeight * .5) : 0;
    if (off) camera.setViewOffset(w, h, 0, off, w, h); else camera.clearViewOffset();
    invalidate();
  }
  function fillCard() {
    const it = items[sel], d = it.data, k = ORDER.indexOf(keyOf(sel));
    ui.cIdx.textContent = String(k + 1).padStart(2, '0'); ui.cCnt.textContent = String(ORDER.length).padStart(2, '0');
    ui.cName.textContent = sel === 'arm' ? itemName('arm') : (EXTRA_CHAIRS.includes(sel) || sel === 'chair1') ? 'Ghế ăn (1 trong 4 chiếc)' : d.name;
    ui.cLoai.textContent = d.loai; ui.cBam.textContent = d.bam; ui.cVung.textContent = d.vung;
    ui.cVl.textContent = MATS[it.mat].name; ui.cNhom.textContent = d.nhom;
    ui.chips.innerHTML = '';
    d.mats.forEach((mk) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'xt-chip';
      b.setAttribute('aria-pressed', String(mk === it.mat));
      b.innerHTML = `<span class="sw" style="background:${MATS[mk].sw}"></span>${MATS[mk].name}`;
      b.addEventListener('click', () => setMaterial(sel, mk));
      ui.chips.appendChild(b);
    });
  }
  let matAnim = null;
  function setMaterial(id, mk) {
    const it = items[id]; if (!it) return;
    const from = it.mat;
    if (from === mk) return;
    it.mat = mk; it.userSet = true;
    const p = MATS[mk];
    it.zone.map = MAPS[p.map] || noiseTex; it.zone.metalness = p.metal;
    if (id === 'lamp' || id === 'sconce') applyLight(lightK);
    if (reduced()) { applyPreset(it.zone, mk); matAnim = null; }
    else { matAnim = { mat: it.zone, a: from, b: mk, t0: performance.now() }; }
    fillCard(); emitLive(); invalidate();
  }
  function stepMatAnim(now) {
    const k = smooth((now - matAnim.t0) / 350);
    lerpMat(matAnim.mat, matAnim.a, matAnim.b, k);
    if (k >= 1) { applyPreset(matAnim.mat, matAnim.b); matAnim = null; }
  }
  stage.querySelector('[data-x="prev"]').addEventListener('click', () => nav(-1));
  stage.querySelector('[data-x="next"]').addEventListener('click', () => nav(1));
  stage.querySelector('.xt-x').addEventListener('click', () => select(null));
  const allBtn = stage.querySelector('.xt-all');
  if (allBtn) allBtn.addEventListener('click', () => { if (tl < T_END) { tl = T_END; playing = false; } mode = 'free'; stage.classList.remove('is-tl'); applyTimeline(tl, true); select(sel || ORDER[0]); });
  function nav(dir) { const k = ORDER.indexOf(keyOf(sel)); select(ORDER[(k + dir + ORDER.length) % ORDER.length]); }
  stage.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sel) { select(null); } });

  // ───────── bấm / rê trên khung ─────────
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickables = Object.values(items).map((it) => it.root);
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, true);
    for (const h of hits) { let o = h.object, vis = true; while (o && !o.userData.item) { if (!o.visible) vis = false; o = o.parent; } if (o && o.visible && vis) return o.userData.item; }
    return null;
  }
  const canPick = () => mode === 'free' || tl >= T_END;
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; if (e.pointerType === 'mouse') armWheel(true); hideTip(); });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); const dt = performance.now() - down.t; down = null;
    if (moved > 6 || dt > 600 || !canPick()) return;
    const id = pick(e.clientX, e.clientY);
    if (id && mode === 'tl') { mode = 'free'; stage.classList.remove('is-tl'); applyTimeline(tl, true); }
    select(id);
  });
  let hoverRaf = 0, hoverEv = null;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    hoverEv = e; if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0; const ev = hoverEv; if (!ev) return;
      const id = canPick() ? pick(ev.clientX, ev.clientY) : null;
      canvas.style.cursor = id ? 'pointer' : 'grab';
      if (id) { const r = stage.getBoundingClientRect(); ui.tip.textContent = itemName(id); ui.tip.style.transform = `translate(${Math.round(ev.clientX - r.left + 14)}px, ${Math.round(ev.clientY - r.top + 16)}px)`; ui.tip.classList.add('is-on'); }
      else hideTip();
    });
  });
  canvas.addEventListener('pointerleave', () => { hoverEv = null; hideTip(); });
  function hideTip() { ui.tip.classList.remove('is-on'); }

  // ───────── không cướp cuộn trang ─────────
  // Máy tính: con lăn chỉ zoom sau khi bấm vào khung (hoặc giữ Ctrl / ⌘); chưa bấm → trang cuộn bình thường + gợi ý.
  let wheelArmed = false, hintT = 0, touchMode = false, touchOn = false;
  stage.addEventListener('pointerdown', () => { if (fly !== 'done') endFly(); }, true);
  stage.addEventListener('keydown', () => { if (fly !== 'done') endFly(); }, true);
  function armWheel(on) { if (wheelArmed === on) return; wheelArmed = on; setHint(on ? 'armed' : 'idle'); }
  stage.addEventListener('wheel', (e) => {
    if (touchMode) return;
    const onCanvas = e.target === canvas;
    controls.enableZoom = onCanvas && (wheelArmed || e.ctrlKey || e.metaKey);
    if (controls.enableZoom && fly !== 'done') endFly();
    if (onCanvas && !controls.enableZoom) setHint('wheel');
  }, { capture: true, passive: true });
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') armWheel(false); });
  document.addEventListener('pointerdown', (e) => { if (!stage.contains(e.target)) armWheel(false); }, true);
  const HINTS = {
    idle: 'Kéo để xoay · bấm vào món đồ để xem · bấm vào khung rồi cuộn để zoom',
    wheel: 'Bấm vào khung rồi cuộn để zoom — hoặc giữ Ctrl khi cuộn',
    armed: 'Cuộn để zoom · đưa chuột ra ngoài khung để cuộn trang',
    touch: '1 ngón: xoay · 2 ngón: zoom · chạm món đồ để xem',
  };
  function setHint(k) {
    clearTimeout(hintT);
    if (touchMode && k === 'idle') k = 'touch';
    ui.hint.textContent = HINTS[k];
    ui.hint.classList.toggle('is-strong', k !== 'idle');
    if (k === 'wheel') hintT = setTimeout(() => setHint(wheelArmed ? 'armed' : 'idle'), 2200);
  }
  setHint('idle');
  function userMoved() { stage.classList.add('was-used'); }
  // Điện thoại: lớp phủ "Chạm để xoay phòng" — trước khi chạm, 1 ngón cuộn trang bình thường.
  function setTouchMode() {
    touchMode = coarse.matches;
    stage.classList.toggle('is-touch', touchMode);
    if (!touchMode) { touchOn = false; controls.enabled = true; stage.classList.remove('is-touch-on'); }
    else setTouchOn(false);
    setHint('idle');
  }
  function setTouchOn(on) {
    touchOn = on; controls.enabled = !touchMode || on;
    controls.enableZoom = touchMode && on;
    stage.classList.toggle('is-touch-on', on);
    if (ui.touch) ui.touch.setAttribute('aria-hidden', on ? 'true' : 'false');
  }
  ui.touch.addEventListener('click', () => setTouchOn(true));
  ui.done.addEventListener('click', () => { setTouchOn(false); select(null); });
  if (coarse.addEventListener) coarse.addEventListener('change', setTouchMode);
  setTouchMode();

  // Nút góc nhìn + Ngày / Đêm
  stage.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => goView(b.getAttribute('data-view'))));
  function setTime(v) {
    if (v === timeOfDay) return;
    timeOfDay = v; stage.setAttribute('data-time', v);
    stage.querySelectorAll('[data-time-set]').forEach((x) => x.setAttribute('aria-pressed', String(x.getAttribute('data-time-set') === v)));
    lightFrom = lightK; lightTo = v === 'dem' ? 1 : 0;
    if (reduced()) { lightK = lightTo; applyLight(lightK); invalidate(); return; }
    lightT0 = performance.now(); lightAnim = true; kick();
  }
  stage.querySelectorAll('[data-time-set]').forEach((b) => b.addEventListener('click', () => setTime(b.getAttribute('data-time-set'))));

  // ───────── vòng vẽ theo yêu cầu ─────────
  let needs = true, raf = 0, visible = false, lastFrame = 0, frames = 0;
  const ft = []; let ftSum = 0;
  const running = () => visible && !document.hidden;
  function invalidate() { needs = true; kick(); }
  function kick() { if (!raf && running()) raf = requestAnimationFrame(frame); }
  const pv = new THREE.Vector3();
  function render() {
    if (gizmo.visible) {   // cỡ trên màn hình cố định ~60 px mỗi trục (như gizmo trong trình dựng cảnh)
      const d = camera.position.distanceTo(gizmo.position), hpx = canvas.clientHeight || 600;
      gizmo.scale.setScalar((gizmo.userData.k || 1) * 60 * 2 * d * Math.tan(camera.fov * DEG / 2) / (.56 * hpx));
    }
    renderer.render(scene, camera);
    frames++;
    reportCam();
    if (ui.glabel.classList.contains('is-on')) {
      pv.copy(glabelAnchor).project(camera);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ui.glabel.style.transform = `translate(${Math.round((pv.x * .5 + .5) * w)}px, ${Math.round((-pv.y * .5 + .5) * h)}px) translate(-50%, -100%)`;
    }
  }
  function frame() {
    raf = 0;
    const now = performance.now();   // cùng gốc thời gian với tween / đèn / vật liệu (không dùng mốc của rAF)
    const dt = lastFrame ? Math.min(.25, (now - lastFrame) / 1000) : 1 / 60;
    let active = false;
    if (tween) { stepTween(now); active = true; }
    if (lightAnim) { const k = smooth((now - lightT0) / 700); lightK = lightFrom + (lightTo - lightFrom) * k; applyLight(lightK); needs = true; if (k >= 1) lightAnim = false; else active = true; }
    if (matAnim) { stepMatAnim(now); needs = true; active = active || !!matAnim; }
    if (playing) {
      if (reduced()) {
        if (now - stepHold > 1500) {
          stepHold = now; stepIdx++;
          if (stepIdx >= MOC_RESULT.length) { playing = false; tl = T_END; } else tl = MOC_RESULT[stepIdx];
          applyTimeline(tl); updateTlUi();
          if (!playing) playEnded();
        }
        active = playing;
      } else {
        tl = Math.min(T_END, tl + dt);
        applyTimeline(tl); updateTlUi();
        if (tl >= T_END) { playing = false; updateTlUi(); playEnded(); } else active = true;
      }
    }
    if (controls.update()) { needs = true; active = true; }
    if (needs) {
      needs = false; render();
      if (lastFrame && active) { const d = now - lastFrame; ft.push(d); ftSum += d; if (ft.length > 90) ftSum -= ft.shift(); adapt(); }
    }
    lastFrame = active ? now : 0;
    if (active || needs) kick();
  }
  // góc camera → trang dịch lớp sao (thị sai); chỉ gọi khi camera thật sự đổi
  const sphCam = new THREE.Spherical(), vCam = new THREE.Vector3(); let camKey = '';
  function reportCam() {
    if (!opt.onCamera) return;
    sphCam.setFromVector3(vCam.copy(camera.position).sub(controls.target));
    const key = sphCam.theta.toFixed(3) + ',' + sphCam.phi.toFixed(3) + ',' + sphCam.radius.toFixed(2);
    if (key === camKey) return;
    camKey = key; opt.onCamera(sphCam.theta, sphCam.phi, sphCam.radius);
  }
  // Máy yếu: khung hình chậm kéo dài → báo trang (kính thành nền đặc) + hạ pixel ratio về 1
  let slowSent = false;
  function adapt() {
    if (ft.length < 60) return;
    const avg = ftSum / ft.length;
    if (!slowSent && avg > 45 && opt.onSlow) { slowSent = true; opt.onSlow(avg); }
    if (dpr <= 1) return;
    if (avg > 40) { dpr = 1; renderer.setPixelRatio(1); resize(); ft.length = 0; ftSum = 0; }
  }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (sel) updateViewOffset();
    outlineMat.uniforms.uRes.value.set(w * dpr, h * dpr);
    outlineMat.uniforms.uPx.value = 3 * dpr;
    invalidate();
  }
  new ResizeObserver(() => {
    const keep = !tween; resize();
    if (fly === 'wait') setPose(flyFrom());
    else if (keep && !stage.classList.contains('was-used')) goView(curView, true);
  }).observe(stage);
  const io = new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
    if (visible) { lastFrame = 0; invalidate(); }
    else { if (touchOn) setTouchOn(false); armWheel(false); hideTip(); }
  }, { threshold: 0 });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastFrame = 0; invalidate(); } });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); playing = false; if (opt.onLost) opt.onLost(); });

  // trạng thái đầu: phòng đã dựng xong, ban đêm; góc toàn cảnh (hoặc điểm xuất phát của cú bay vào)
  resize();
  goView('toan', true);
  if (fly === 'wait') {
    controls.maxDistance = 120;
    setPose(flyFrom());
    const fio = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting && e.intersectionRatio >= .44)) { fio.disconnect(); startFly(); }
    }, { threshold: [.45] });
    fio.observe(stage);
  }
  applyTimeline(T_END, true);
  updateTlUi();
  stage.classList.add('is-ready');
  stage.setAttribute('data-time', timeOfDay);
  stage.querySelectorAll('[data-time-set]').forEach((x) => x.setAttribute('aria-pressed', String(x.getAttribute('data-time-set') === timeOfDay)));

  // số liệu cho kiểm thử
  function tris() {
    let n = 0, all = 0;
    scene.traverse((o) => { if (!o.isMesh || o.userData.isHull) return; const g = o.geometry; const c = (g.index ? g.index.count : g.attributes.position.count) / 3; all += c; let v = true, p = o; while (p) { if (!p.visible) v = false; p = p.parent; } if (v) n += c; });
    return { visible: Math.round(n), all: Math.round(all) };
  }
  window.__xt = {
    stats: () => ({ frames, avgMs: ft.length ? +(ftSum / ft.length).toFixed(1) : null, fps: ft.length ? +(1000 / (ftSum / ft.length)).toFixed(1) : null, samples: ft.length, dpr, tris: tris(), calls: renderer.info.render.calls, rTris: renderer.info.render.triangles, tl: +tl.toFixed(2), playing, mode, sel, view: curView, time: timeOfDay, touchOn, zoom: controls.enableZoom, gl: renderer.capabilities.isWebGL2 ? 2 : 1, dist: +camera.position.distanceTo(controls.target).toFixed(2), cam: camera.position.toArray().map((v) => +v.toFixed(2)), tween: !!tween, fly, card: ui.card.classList.contains('is-open'), sofaMat: items.sofa.mat, armVar: items.arm.variant }),
    screenOf: (id) => { const it = items[id]; const b = new THREE.Box3().setFromObject(it.root); const c = b.getCenter(new THREE.Vector3()).project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (c.x * .5 + .5) * r.width, y: r.top + (-c.y * .5 + .5) * r.height }; },
    resetFt: () => { ft.length = 0; ftSum = 0; },
  };
  return { select, goView, setTime, play, pause };
}
