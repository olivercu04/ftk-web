/* FTK — viewport ảnh AI (B2). JS thuần, không bước build, nhúng được vào trang khác (B5).
 *
 *   const vp = new FtkViewport(phanTu, nguon, tuyChon); await vp.tai();
 *   nguon = new FtkNguon.MayChu(maPhien)   — gọi API máy chủ cục bộ (ftk_anh.may_chu)
 *         | new FtkNguon.Tinh(canh, gocTep) — demo tĩnh, không máy chủ (B5)
 *   tuyChon: { phimToanTrang: bool, guiYeuCau: async ({noi_dung, mon, vung}) => {...} }
 *
 * Tầng trình diễn: chỉ hiện + gửi lệnh. Món dưới con trỏ = tra id_map (mỗi pixel 1 số) → không phụ thuộc
 * cách tạo mask (đa giác tay / SAM). Hoàn tác / làm lại do nguồn quyết (máy chủ: ftk_anh/canh.py).
 */
(function () {
  'use strict';

  // ───────── Nguồn dữ liệu (cùng giao diện) ─────────
  class NguonMayChu {
    constructor(maPhien, goc) { this.ma = maPhien; this.goc = goc || ''; }
    _url(duoi) { return `${this.goc}/api/phien/${encodeURIComponent(this.ma)}${duoi}`; }
    async layCanh() {
      const r = await fetch(this._url(''), { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.loi || `HTTP ${r.status}`);
      return j.canh;
    }
    // k: khoá cache (vd tao_luc của phiên bản) — ảnh của 1 bản là bất biến, nhưng phiên xoá rồi tạo lại cùng tên thì khác
    urlTep(duong, k) {
      return this._url('/tep/' + duong.split('/').map(encodeURIComponent).join('/')) + (k ? '?k=' + encodeURIComponent(k) : '');
    }
    async _lenh(ten, than) {
      const r = await fetch(this._url('/' + ten), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FTK': '1' },
        body: JSON.stringify(than || {}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.loi || `HTTP ${r.status}`);
      return j;                                   // { hien_tai, doi }
    }
    hoanTac() { return this._lenh('hoan-tac'); }
    lamLai() { return this._lenh('lam-lai'); }
    chon(id) { return this._lenh('chon', { id }); }
  }

  // Demo tĩnh: giữ canh trong RAM. Bản sao 3 luật của ftk_anh/canh.py (hoan_tac · lam_lai · chọn) CHỈ cho
  // trang không có máy chủ — luật gốc ở canh.py, đổi luật thì đổi cả 2.
  class NguonTinh {
    constructor(canh, gocTep) { this.canh = JSON.parse(JSON.stringify(canh)); this.gocTep = gocTep || ''; }
    async layCanh() { return JSON.parse(JSON.stringify(this.canh)); }
    urlTep(duong) { return this.gocTep + duong; }
    _pb(id) { return this.canh.phien_ban.find(p => p.id === id); }
    async hoanTac() {
      const tu = this._pb(this.canh.hien_tai).tu;
      if (tu == null) return { hien_tai: this.canh.hien_tai, doi: false };
      this.canh.hien_tai = tu;
      return { hien_tai: tu, doi: true };
    }
    async lamLai() {
      const con = this.canh.phien_ban.filter(p => p.tu === this.canh.hien_tai);
      if (!con.length) return { hien_tai: this.canh.hien_tai, doi: false };
      this.canh.hien_tai = con[con.length - 1].id;
      return { hien_tai: this.canh.hien_tai, doi: true };
    }
    async chon(id) {
      if (!this._pb(id)) throw new Error(`khong co phien ban '${id}'`);
      const doi = this.canh.hien_tai !== id;
      this.canh.hien_tai = id;
      return { hien_tai: id, doi };
    }
  }

  // ───────── Tiện ích ─────────
  const NHAN_RGB = [163, 150, 255];
  const BO_TOI_DA = 8;                              // số phiên bản giữ trong bộ đệm
  const VIEN_PX = 2;                                // độ dày viền (px ảnh gốc), mỗi phía
  const SVG_X = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function taiAnh(url) {
    return new Promise((ok, loi) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => ok(im);
      im.onerror = () => loi(new Error('khong tai duoc anh'));
      im.src = url;
    });
  }

  async function taiIdMap(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('khong tai duoc id_map');
    const bm = await createImageBitmap(await r.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const cv = document.createElement('canvas');
    cv.width = bm.width; cv.height = bm.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(bm, 0, 0);
    const d = cx.getImageData(0, 0, bm.width, bm.height).data;
    const ids = new Uint8Array(bm.width * bm.height);
    for (let i = 0, j = 0; j < ids.length; i += 4, j++) ids[j] = d[i];
    bm.close && bm.close();
    return { ids, W: cv.width, H: cv.height };
  }

  function tinhKhung(ids, W, H) {
    const k = new Map();                            // chỉ số món → [x0, y0, x1, y1]
    for (let y = 0, p = 0; y < H; y++) {
      for (let x = 0; x < W; x++, p++) {
        const v = ids[p];
        if (!v) continue;
        const b = k.get(v);
        if (!b) k.set(v, [x, y, x, y]);
        else { if (x < b[0]) b[0] = x; if (x > b[2]) b[2] = x; if (y < b[1]) b[1] = y; if (y > b[3]) b[3] = y; }
      }
    }
    return k;
  }

  // ───────── Viewport ─────────
  class FtkViewport {
    constructor(goc, nguon, tuyChon) {
      this.goc = goc;
      this.nguon = nguon;
      this.tc = Object.assign({ phimToanTrang: false, guiYeuCau: null }, tuyChon || {});
      this.canh = null; this.pb = null;
      this.ids = null; this.W = 0; this.H = 0; this.khung = new Map();
      this.hover = 0; this.chon = 0; this.idChon = null;
      this.cache = new Map();
      this.bo = new Map();                        // bộ đệm phiên bản (_taiBan)
      this.luot = 0;
      this.hang = Promise.resolve();              // hàng lệnh: chạy lần lượt, không nuốt lệnh nào
      this.soCho = 0;                             // số lệnh đang xếp hàng — chỉ lệnh cuối mới vẽ ảnh
      this._go = [];                              // [đích, sự kiện, hàm] để huy() gỡ
      this._dung();
      this._noi();
    }

    _on(dich, ten, ham) { dich.addEventListener(ten, ham); this._go.push([dich, ten, ham]); }

    huy() {                                       // gỡ mọi sự kiện (nhúng / bỏ nhúng nhiều lần — B5)
      for (const [d, t, h] of this._go) d.removeEventListener(t, h);
      this._go = [];
      this.cache.clear();
      this.bo.clear();
      this.ids = null;
      this.goc.innerHTML = '';
      this.goc.classList.remove('ftkv');
    }

    // ── dựng DOM ──
    _dung() {
      this.goc.classList.add('ftkv');
      this.goc.innerHTML = `
        <div class="ftkv-khung">
          <div class="ftkv-san" tabindex="0" role="application" aria-label="Ảnh phòng — rê chuột để xem từng món, bấm để chọn món muốn sửa">
            <img class="ftkv-anh" alt=""><img class="ftkv-anh an" alt="">
            <canvas class="ftkv-phu"></canvas>
            <div class="ftkv-nhan" aria-hidden="true"></div>
            <div class="ftkv-dang-tai">Đang tải ảnh…</div>
            <aside class="ftkv-the" aria-label="Món đang chọn" aria-hidden="true">
              <div class="ftkv-the-dau">
                <p class="ftkv-the-tren">Món · <span data-x="stt"></span></p>
                <button class="ftkv-x" type="button" data-x="bo" aria-label="Bỏ chọn món">${SVG_X}</button>
              </div>
              <h3 data-x="ten"></h3>
              <dl><dt>Loại</dt><dd data-x="loai"></dd><dt>Đổi gần nhất</dt><dd data-x="doi"></dd></dl>
              <div class="ftkv-the-dong">
                <button class="ftkv-nut rong" type="button" data-x="truoc">← Món trước</button>
                <button class="ftkv-nut rong" type="button" data-x="sau">Món sau →</button>
              </div>
              <button class="ftkv-nut chinh rong" type="button" data-x="sua" style="margin-top:8px;width:100%">Sửa món này</button>
            </aside>
            <div class="ftkv-bao" role="status" aria-live="polite"></div>
          </div>
        </div>
        <div class="ftkv-thanh">
          <div class="ftkv-ban" role="toolbar" aria-label="Các phiên bản ảnh"></div>
          <div class="ftkv-nhom">
            <button class="ftkv-nut" type="button" data-x="hoan-tac" title="Hoàn tác (Ctrl+Z)">↶ Hoàn tác</button>
            <button class="ftkv-nut" type="button" data-x="lam-lai" title="Làm lại (Ctrl+Shift+Z)">↷ Làm lại</button>
          </div>
        </div>
        <form class="ftkv-chat" autocomplete="off">
          <span class="ftkv-chat-dich"><span></span><button type="button" aria-label="Bỏ chọn món">✕</button></span>
          <input type="text" maxlength="500" aria-label="Yêu cầu của bạn">
          <button class="ftkv-nut chinh" type="submit">Gửi</button>
        </form>`;
      const $ = s => this.goc.querySelector(s);
      this.el = {
        san: $('.ftkv-san'), anh: this.goc.querySelectorAll('.ftkv-anh'), phu: $('.ftkv-phu'),
        nhan: $('.ftkv-nhan'), tai: $('.ftkv-dang-tai'), the: $('.ftkv-the'), bao: $('.ftkv-bao'),
        ban: $('.ftkv-ban'), hoanTac: $('[data-x="hoan-tac"]'), lamLai: $('[data-x="lam-lai"]'),
        chat: $('.ftkv-chat'), o: $('.ftkv-chat input'), dich: $('.ftkv-chat-dich'),
      };
      this.el.anhHien = 0;                          // ảnh đang hiện = el.anh[anhHien]
      this.cx = this.el.phu.getContext('2d');
      this._capNhatChat();
    }

    // ── sự kiện ──
    _noi() {
      const san = this.el.san;
      this._on(san, 'pointermove', e => { if (e.pointerType !== 'touch') this._roi(e); });
      this._on(san, 'pointerleave', () => this._datHover(0));
      this._on(san, 'click', e => {
        if (e.target.closest('.ftkv-the')) return;
        const k = this._idTai(e);
        if (k) this._chonChiSo(k); else this.boChon();
      });
      this._on(san, 'keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this._buocMon(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this._buocMon(-1); }
      });
      const q = s => this.goc.querySelector(s);
      this._on(q('[data-x="bo"]'), 'click', () => this.boChon());
      this._on(q('[data-x="truoc"]'), 'click', () => this._buocMon(-1));
      this._on(q('[data-x="sau"]'), 'click', () => this._buocMon(1));
      this._on(q('[data-x="sua"]'), 'click', () => this.el.o.focus());
      this._on(this.el.dich.querySelector('button'), 'click', () => this.boChon());
      this._on(this.el.hoanTac, 'click', () => this.hoanTac());
      this._on(this.el.lamLai, 'click', () => this.lamLai());
      this._on(this.el.chat, 'submit', e => { e.preventDefault(); this._gui(); });

      const phim = e => {
        const trongO = e.target instanceof HTMLElement && (e.target.matches('input, textarea, [contenteditable]'));
        if (e.key === 'Escape') {
          if (trongO) { e.target.blur(); return; }          // Esc lần 1: rời ô chat · lần 2: bỏ chọn món
          if (this.chon) { this.boChon(); e.preventDefault(); }
          return;
        }
        if (trongO) return;
        const ctrl = e.ctrlKey || e.metaKey;
        if (ctrl && !e.altKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? this.lamLai() : this.hoanTac(); }
        else if (ctrl && !e.altKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); this.lamLai(); }
      };
      this._on(this.tc.phimToanTrang ? document : this.goc, 'keydown', phim);
    }

    // ── tải + hiện ──
    async tai() {
      try {
        this.canh = await this.nguon.layCanh();
        await this._hien(this.canh.hien_tai, false);
      } catch (e) {
        this.el.tai.textContent = 'Không tải được phiên: ' + e.message;
        throw e;
      }
    }

    async _hien(idPb, chuyenMo) {
      const luot = ++this.luot;
      const pb = this.canh.phien_ban.find(p => p.id === idPb);
      if (!pb) throw new Error(`khong co phien ban ${idPb}`);
      const { anh, map, khung } = await this._taiBan(pb);
      if (luot !== this.luot) return;               // người dùng đã đổi bản khác trong lúc tải → bỏ kết quả cũ
      this.pb = pb;
      this.ids = map.ids; this.W = map.W; this.H = map.H;
      this.khung = khung;
      this.cache.clear();
      this.el.phu.width = this.W; this.el.phu.height = this.H;
      // khung đúng tỉ lệ ảnh thật (không ép 3:2) → toạ độ bấm khớp pixel ảnh
      this.goc.style.setProperty('--ftkv-tl', String(this.W / this.H));
      this.el.san.style.aspectRatio = `${this.W} / ${this.H}`;
      this.el.san.classList.remove('tro');
      this.el.nhan.classList.remove('hien');
      // giữ món đang chọn nếu bản mới vẫn có món đó
      const i = this.idChon ? pb.mon.findIndex(m => m.id === this.idChon) : -1;
      this.chon = i >= 0 ? i + 1 : 0;
      if (!this.chon) this.idChon = null;
      this.hover = 0;
      this._doiAnh(anh, chuyenMo);
      this.el.tai.classList.add('an');
      this._ve();
      this._capNhatThe();
      this._capNhatThanh();
      this._capNhatChat();
      this._taiTruoc();
    }

    _doiAnh(anh, chuyenMo) {
      const [a, b] = this.el.anh;
      const cu = this.el.anhHien === 0 ? a : b;
      const moi = this.el.anhHien === 0 ? b : a;
      clearTimeout(this._henMo);
      // đang chuyển dở (đổi bản 2 lần trong < 0,4 s): chốt ảnh đang hiện dần thành đậm hẳn trước → không lộ nền tối
      cu.style.transition = 'none'; cu.classList.remove('an'); void cu.offsetWidth; cu.style.transition = '';
      if (!chuyenMo || !cu.getAttribute('src')) {
        cu.src = anh.src; cu.classList.remove('an'); cu.style.zIndex = '0';
        moi.classList.add('an');
        return;
      }
      // ảnh cũ ĐỨNG YÊN đủ đậm ở dưới; ảnh mới hiện dần ở trên → không loá tối giữa chừng, chỉ vùng đổi là thấy khác
      moi.style.transition = 'none';
      moi.classList.add('an');
      moi.src = anh.src;
      moi.style.zIndex = '1'; cu.style.zIndex = '0';
      cu.classList.remove('an');
      void moi.offsetWidth;                        // chốt opacity 0 trước khi bật chuyển cảnh
      moi.style.transition = '';
      moi.classList.remove('an');
      this.el.anhHien ^= 1;
      this._henMo = setTimeout(() => { cu.style.transition = 'none'; cu.classList.add('an'); void cu.offsetWidth; cu.style.transition = ''; }, 420);
    }

    // Bộ đệm phiên bản: ảnh đã giải mã + id_map + khung món (≈ 8 MB / bản). Giữ tối đa BO_TOI_DA bản gần nhất.
    _taiBan(pb) {
      const k = (this.canh && this.canh.ma_phien) + '|' + pb.id + '|' + pb.tao_luc;   // gồm mã phiên: đổi phiên không lẫn
      let v = this.bo.get(k);
      if (!v) {
        v = Promise.all([taiAnh(this.nguon.urlTep(pb.anh, pb.tao_luc)), taiIdMap(this.nguon.urlTep(pb.id_map, pb.tao_luc))])
          .then(async ([anh, map]) => {
            if (anh.decode) { try { await anh.decode(); } catch (_) { /* đã onload */ } }
            return { anh, map, khung: tinhKhung(map.ids, map.W, map.H) };
          });
        v.catch(() => this.bo.delete(k));         // lỗi tải không được nằm lì trong bộ đệm
        this.bo.set(k, v);
        while (this.bo.size > BO_TOI_DA) this.bo.delete(this.bo.keys().next().value);
      } else {
        this.bo.delete(k); this.bo.set(k, v);     // vừa dùng → đưa về cuối (LRU)
      }
      return v;
    }

    _taiTruoc() {                                   // tải + giải mã sẵn bản cha / con → đổi bản gần như tức thì
      const lien = this.canh.phien_ban.filter(p => p.id === this.pb.tu || p.tu === this.pb.id);
      lien.forEach(p => { this._taiBan(p).catch(() => {}); });
    }

    // ── con trỏ → món ──
    _toaDo(e) {
      const r = this.el.san.getBoundingClientRect();
      return { x: Math.floor((e.clientX - r.left) / r.width * this.W), y: Math.floor((e.clientY - r.top) / r.height * this.H),
        px: e.clientX - r.left, py: e.clientY - r.top };
    }
    _idTai(e) {
      if (!this.ids) return 0;
      const { x, y } = this._toaDo(e);
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) return 0;
      return this.ids[y * this.W + x];
    }
    _roi(e) {
      if (!this.ids || e.target.closest('.ftkv-the')) { this._datHover(0); return; }
      const k = this._idTai(e);
      this._datHover(k);
      if (k) {
        // nhãn luôn nằm trọn trong khung: kẹp ngang theo bề rộng nhãn, sát mép trên thì lật xuống dưới con trỏ
        const { px, py } = this._toaDo(e);
        const r = this.el.san.getBoundingClientRect();
        const nw = this.el.nhan.offsetWidth || 120;
        const x = Math.min(Math.max(px, nw / 2 + 8), r.width - nw / 2 - 8);
        this.el.nhan.style.left = x + 'px';
        this.el.nhan.style.top = py + 'px';
        this.el.nhan.classList.toggle('duoi', py < 52);
      }
    }
    _datHover(k) {
      if (k === this.hover) return;
      this.hover = k;
      const m = k ? this.pb.mon[k - 1] : null;
      this.el.san.classList.toggle('tro', !!k);
      this.el.nhan.textContent = m ? m.ten_vi : '';
      this.el.nhan.classList.toggle('hien', !!m && k !== this.chon);
      this._ve();
    }

    // ── chọn món ──
    _chonChiSo(k) {
      this.chon = k;
      this.idChon = this.pb.mon[k - 1].id;
      this.el.nhan.classList.remove('hien');
      this._ve(); this._capNhatThe(); this._capNhatChat();
      if (this.tc.onChon) this.tc.onChon(this.idChon);
    }
    chonMon(id) {
      const i = this.pb ? this.pb.mon.findIndex(m => m.id === id) : -1;
      if (i >= 0) this._chonChiSo(i + 1);
    }
    boChon() {
      if (!this.chon) return;
      this.chon = 0; this.idChon = null;
      this._ve(); this._capNhatThe(); this._capNhatChat();
      if (this.tc.onChon) this.tc.onChon(null);
    }
    _buocMon(d) {
      if (!this.pb) return;
      const n = this.pb.mon.length;
      const k = this.chon ? ((this.chon - 1 + d + n) % n) + 1 : (d > 0 ? 1 : n);
      this._chonChiSo(k);
    }

    // ── vẽ lớp phủ ──
    _hinh(k) {                                      // canvas tô + viền (trắng / nhấn) cắt theo khung món, có cache
      if (this.cache.has(k)) return this.cache.get(k);
      const b = this.khung.get(k);
      if (!b) return null;
      const x0 = b[0], y0 = b[1], w = b[2] - b[0] + 1, h = b[3] - b[1] + 1;
      const ids = this.ids, W = this.W, H = this.H;
      const to = new ImageData(w, h), trang = new ImageData(w, h), nhan = new ImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const gx = x0 + x, gy = y0 + y;
          if (ids[gy * W + gx] !== k) continue;
          const o = (y * w + x) * 4;
          to.data[o] = to.data[o + 1] = to.data[o + 2] = 255; to.data[o + 3] = 255;
          let bien = false;
          for (let r = 1; r <= VIEN_PX && !bien; r++) {
            for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
              const nx = gx + dx, ny = gy + dy;
              if (nx < 0 || ny < 0 || nx >= W || ny >= H || ids[ny * W + nx] !== k) { bien = true; break; }
            }
          }
          if (bien) {
            trang.data[o] = trang.data[o + 1] = trang.data[o + 2] = 255; trang.data[o + 3] = 235;
            nhan.data[o] = NHAN_RGB[0]; nhan.data[o + 1] = NHAN_RGB[1]; nhan.data[o + 2] = NHAN_RGB[2]; nhan.data[o + 3] = 255;
          }
        }
      }
      const cv = d => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(d, 0, 0); return c; };
      const v = { x0, y0, to: cv(to), trang: cv(trang), nhan: cv(nhan) };
      this.cache.set(k, v);
      return v;
    }

    _ve() {
      const cx = this.cx;
      if (!this.W) return;
      cx.clearRect(0, 0, this.W, this.H);
      if (this.chon) {
        const v = this._hinh(this.chon);
        cx.fillStyle = 'rgba(4, 4, 10, 0.5)';            // làm tối phần còn lại → món chọn nổi lên
        cx.fillRect(0, 0, this.W, this.H);
        if (v) {
          cx.globalCompositeOperation = 'destination-out';
          cx.drawImage(v.to, v.x0, v.y0);
          cx.globalCompositeOperation = 'source-over';
          cx.drawImage(v.nhan, v.x0, v.y0);
        }
      }
      if (this.hover && this.hover !== this.chon) {
        const v = this._hinh(this.hover);
        if (v) {
          cx.globalAlpha = 0.14; cx.drawImage(v.to, v.x0, v.y0);
          cx.globalAlpha = 1; cx.drawImage(v.trang, v.x0, v.y0);
        }
      }
    }

    // ── thẻ, thanh, chat ──
    _capNhatThe() {
      const the = this.el.the;
      const m = this.chon ? this.pb.mon[this.chon - 1] : null;
      the.classList.toggle('hien', !!m);
      the.setAttribute('aria-hidden', m ? 'false' : 'true');
      if (!m) return;
      const q = s => the.querySelector(s);
      q('[data-x="stt"]').textContent = `${this.chon} / ${this.pb.mon.length}`;
      q('[data-x="ten"]').textContent = m.ten_vi;
      q('[data-x="loai"]').textContent = (m.loai_ftk || '—').replace(/_/g, ' ');
      const lan = [...this.canh.phien_ban].reverse().find(p => p.sua && p.sua.mon === m.id && this._tren_duong(p.id));
      q('[data-x="doi"]').textContent = lan ? `${lan.id} — “${lan.sua.yeu_cau_khach || ''}”` : 'chưa đổi';
    }

    _duong() {                                      // các bản từ gốc tới bản đang xem (chặn vòng nếu canh hỏng)
      const s = new Set();
      let p = this.pb;
      while (p && !s.has(p.id)) { s.add(p.id); p = p.tu == null ? null : this.canh.phien_ban.find(x => x.id === p.tu); }
      return s;
    }
    _tren_duong(id) { return this._duong().has(id); }

    _capNhatThanh() {
      const ban = this.el.ban;
      const duong = this._duong();
      ban.innerHTML = '';
      for (const p of this.canh.phien_ban) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ftkv-chip' + (duong.has(p.id) || p.tu === this.pb.id ? '' : ' ngoai');
        b.setAttribute('aria-current', p.id === this.pb.id ? 'true' : 'false');
        let nhan = 'Ảnh đầu';
        if (p.sua) {
          const m = (p.mon || []).find(x => x.id === p.sua.mon);
          nhan = 'Đổi ' + (m ? m.ten_vi : p.sua.mon);
        }
        b.title = p.sua && p.sua.yeu_cau_khach ? `${p.id}: ${p.sua.yeu_cau_khach}` : p.id;
        const im = document.createElement('img');
        im.alt = ''; im.loading = 'lazy'; im.src = this.nguon.urlTep(p.anh, p.tao_luc);
        const t = document.createElement('span');
        const id = document.createElement('b');
        id.textContent = p.id;                      // dữ liệu không bao giờ vào innerHTML
        t.append(id, document.createTextNode(nhan.length > 22 ? nhan.slice(0, 21) + '…' : nhan));
        b.append(im, t);
        b.addEventListener('click', () => this.chonBan(p.id));
        ban.append(b);
      }
      const cur = ban.querySelector('[aria-current="true"]');
      if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.el.hoanTac.disabled = this.pb.tu == null;
      this.el.lamLai.disabled = !this.canh.phien_ban.some(p => p.tu === this.pb.id);
    }

    _capNhatChat() {
      const m = this.chon && this.pb ? this.pb.mon[this.chon - 1] : null;
      this.el.dich.classList.toggle('hien', !!m);
      this.el.dich.querySelector('span').textContent = m ? m.ten_vi : '';
      this.el.o.placeholder = m ? `Muốn đổi ${m.ten_vi.toLowerCase()} thế nào? Ví dụ: “bọc nhung xanh rêu”`
        : 'Mô tả căn phòng bạn muốn, hoặc bấm một món trên ảnh để sửa…';
    }

    // ── lệnh ──
    // Hàng lệnh: mọi lệnh chạy LẦN LƯỢT (Ctrl+Z bấm 3 lần = lùi 3 bản; bấm v1 rồi v2 = dừng ở v2).
    // Lệnh đang xếp sau thì lệnh trước chỉ đổi dữ liệu, KHÔNG vẽ ảnh — chỉ lệnh cuối hàng vẽ.
    _lenh(viec, moTa) {
      this.soCho++;
      const chay = async () => {
        let kq = null, loi = null;
        try { kq = await viec(); } catch (e) { loi = e; }
        this.soCho--;                               // trừ ĐÚNG 1 lần mỗi lệnh
        try {
          if (loi) throw loi;
          if (kq.doi) {
            this.canh = await this.nguon.layCanh();
            if (this.soCho === 0) {
              await this._hien(kq.hien_tai, true);
              if (moTa) this.bao(moTa + ' — ' + kq.hien_tai);
            }
          } else if (this.soCho === 0 && this.pb && this.canh.hien_tai !== this.pb.id) {
            await this._hien(this.canh.hien_tai, true);  // lệnh trước đã đổi dữ liệu mà chưa vẽ
          }
        } catch (e) {
          this.bao('Lỗi: ' + e.message, true);
          if (this.soCho === 0) {
            try { this.canh = await this.nguon.layCanh(); await this._hien(this.canh.hien_tai, false); } catch (_) { /* giữ nguyên màn */ }
          }
        }
      };
      this.hang = this.hang.then(chay, chay);
      return this.hang;
    }
    hoanTac() { return this._lenh(() => this.nguon.hoanTac(), 'Đã hoàn tác'); }
    lamLai() { return this._lenh(() => this.nguon.lamLai(), 'Đã làm lại'); }
    chonBan(id) { return this._lenh(() => this.nguon.chon(id)); }

    async lamMoi() {                                // gọi khi bên ngoài đã đổi canh (B3: có phiên bản mới)
      this.canh = await this.nguon.layCanh();
      await this._hien(this.canh.hien_tai, true);
    }

    async _gui() {
      const noi = this.el.o.value.trim();
      if (!noi) { this.el.o.focus(); return; }
      if (!this.tc.guiYeuCau) { this.bao('Trang này chưa nối gửi yêu cầu.'); return; }
      if (this._dangGui) return;                    // chống gửi đúp (Enter 2 lần / bấm 2 lần)
      this._dangGui = true;
      const nut = this.el.chat.querySelector('[type="submit"]');
      nut.disabled = true;
      try {
        await this.tc.guiYeuCau({ noi_dung: noi, mon: this.idChon, vung: null, phien_ban: this.pb && this.pb.id });
        this.el.o.value = '';
      } catch (e) {
        this.bao('Lỗi: ' + e.message, true);
      } finally {
        this._dangGui = false;
        nut.disabled = false;
      }
    }

    bao(chu, loi, uuTien) {
      const b = this.el.bao;
      // thông báo lỗi còn đang hiện thì không để thông báo thường đè mất (khách phải đọc được lỗi);
      // uuTien = tin quan trọng (đã có bản mới, đã gửi) — luôn hiện
      if (!loi && !uuTien && b.classList.contains('loi') && b.classList.contains('hien') && Date.now() < (this._loiDen || 0)) return;
      if (loi) this._loiDen = Date.now() + 4200;
      b.textContent = chu;
      b.classList.toggle('loi', !!loi);
      b.classList.add('hien');
      clearTimeout(this._henBao);
      this._henBao = setTimeout(() => b.classList.remove('hien'), loi ? 4200 : 2400);
    }
  }

  window.FtkViewport = FtkViewport;
  window.FtkNguon = { MayChu: NguonMayChu, Tinh: NguonTinh };
})();
