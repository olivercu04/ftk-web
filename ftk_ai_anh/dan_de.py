# Dán đè miếng sửa của ChatGPT vào ảnh cũ, CHỈ trong vùng mask của món được sửa.
# Dùng: python dan_de.py <thu_muc_phien> <canh_cu.json> <cat_info.json> <anh_tra_ve> <anh_moi.png> <canh_moi.json> "<mo_ta_moi>" "<yeu_cau_khach>"
# Ngoài vùng mask: ảnh mới = ảnh cũ từng pixel (chốt chặn cuối của luồng sửa).
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

NOI_PX = 8        # nới mask món sửa (px ảnh gốc) để ăn hết viền cũ
MEM_PX = 4        # làm mờ mép miếng vá
CHE_PX = 2        # nới mask món đứng TRƯỚC (z cao hơn) để không dán đè lên nó


def lech_pha(a, b):
    """Độ lệch (dx, dy) cần dời b để khớp a — tương quan pha."""
    h, w = a.shape
    win = np.outer(np.hanning(h), np.hanning(w))
    Fa, Fb = np.fft.fft2(a * win), np.fft.fft2(b * win)
    R = Fa * np.conj(Fb)
    R /= np.abs(R) + 1e-9
    r = np.fft.ifft2(R).real
    dy, dx = np.unravel_index(np.argmax(r), r.shape)
    if dy > h // 2: dy -= h
    if dx > w // 2: dx -= w
    return int(dx), int(dy)


def mask_poly(pts, W, H):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in pts], fill=255)
    return m


def chay(thu_muc, canh_cu, cat_info, anh_tra, anh_moi, canh_moi, mo_ta_moi, yeu_cau):
    canh = json.load(open(os.path.join(thu_muc, canh_cu), encoding="utf-8-sig"))
    info = json.load(open(os.path.join(thu_muc, cat_info), encoding="utf-8-sig"))
    cu = Image.open(os.path.join(thu_muc, canh["anh"])).convert("RGB")
    W, H = cu.size
    x0, y0, x1, y1 = info["vung_cat_px"]
    cw, ch = x1 - x0, y1 - y0
    tra = Image.open(os.path.join(thu_muc, anh_tra)).convert("RGB").resize((cw, ch), Image.LANCZOS)
    cat_cu = cu.crop((x0, y0, x1, y1))

    # vùng dán = mask món sửa (nới) − mask các món đứng trước nó
    mon = {m["id"]: m for m in canh["mon"]}
    sua = mon[info["id"]]
    vung = mask_poly(sua["poly_px"], W, H).filter(ImageFilter.MaxFilter(2 * NOI_PX + 1))
    for m in canh["mon"]:
        if m["z"] > sua["z"]:
            che = mask_poly(m["poly_px"], W, H).filter(ImageFilter.MaxFilter(2 * CHE_PX + 1))
            vung = Image.fromarray(np.minimum(np.array(vung), 255 - np.array(che)))
    vung_cat = vung.crop((x0, y0, x1, y1))

    # căn khớp: chỉ dùng phần NGOÀI vùng dán (phần ChatGPT lẽ ra không đổi)
    ngoai = (np.array(vung_cat) == 0).astype(np.float64)
    a = np.asarray(cat_cu.convert("L"), dtype=np.float64) * ngoai
    b = np.asarray(tra.convert("L"), dtype=np.float64) * ngoai
    dx, dy = lech_pha(a, b)
    khop = Image.new("RGB", (cw, ch))
    khop.paste(cat_cu, (0, 0))
    khop.paste(tra, (dx, dy))

    # đo ChatGPT đã đổi bao nhiêu NGOÀI vùng dán (chỉ để báo — ảnh mới không lấy phần này)
    d = np.abs(np.asarray(khop, dtype=np.float64) - np.asarray(cat_cu, dtype=np.float64)).mean(axis=2)
    lech_ngoai = float(d[ngoai > 0].mean())

    alpha = vung_cat.filter(ImageFilter.GaussianBlur(MEM_PX))
    moi_cat = Image.composite(khop, cat_cu, alpha)
    moi = cu.copy()
    moi.paste(moi_cat, (x0, y0))
    moi.save(os.path.join(thu_muc, anh_moi))

    # kiểm: ngoài vùng (sau khi mờ mép) ảnh mới == ảnh cũ
    A = np.zeros((H, W), dtype=np.uint8)
    A[y0:y1, x0:x1] = np.array(alpha)
    khac = np.any(np.asarray(moi) != np.asarray(cu), axis=2)
    pixel_ngoai_doi = int((khac & (A == 0)).sum())

    # ảnh so sánh trước / sau (cùng vùng cắt)
    ss = Image.new("RGB", (cw * 2 + 10, ch), (255, 255, 255))
    ss.paste(cat_cu, (0, 0)); ss.paste(moi_cat, (cw + 10, 0))
    ss.save(os.path.join(thu_muc, "so_sanh_" + os.path.splitext(anh_moi)[0] + ".jpg"), quality=88)

    so = int(canh.get("phien_ban", "v0").lstrip("v")) + 1
    canh_ra = dict(canh)
    canh_ra["phien_ban"] = f"v{so}"
    canh_ra["anh"] = anh_moi
    canh_ra["mon"] = [dict(m, mo_ta=mo_ta_moi) if m["id"] == info["id"] else m for m in canh["mon"]]
    canh_ra["lich_su"] = canh.get("lich_su", []) + [{
        "phien_ban": f"v{so}", "tu": canh["anh"], "sua": info["id"], "yeu_cau_khach": yeu_cau,
        "anh_tra_ve": anh_tra, "lech_can_khop_px": [dx, dy], "lech_ngoai_vung_tb": round(lech_ngoai, 2),
        "pixel_ngoai_vung_bi_doi": pixel_ngoai_doi}]
    json.dump(canh_ra, open(os.path.join(thu_muc, canh_moi), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(json.dumps(canh_ra["lich_su"][-1], ensure_ascii=False))


if __name__ == "__main__":
    chay(*sys.argv[1:9])
