# Cắt vùng quanh 1 món (khung 3:2, nới 1,5 lần) rồi phóng lên 1536x1024 để gửi ChatGPT sửa.
# Dùng: python cat_vung.py <thu_muc_phien> <canh.json> <id_mon> <ten_ra_png>
import json, sys, os
from PIL import Image

thu_muc, ten_canh, id_mon, ten_ra = sys.argv[1:5]
canh = json.load(open(os.path.join(thu_muc, ten_canh), encoding="utf-8"))
anh = Image.open(os.path.join(thu_muc, canh["anh"])).convert("RGB")
W, H = anh.size
mon = next(m for m in canh["mon"] if m["id"] == id_mon)
x0, y0, x1, y1 = mon["khung_px"]
kw, kh = x1 - x0, y1 - y0
w = max(1.5 * kw, 1.5 * kh * 1.5)
w = min(w, W, H * 1.5)
h = w / 1.5
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
cx0 = int(round(min(max(cx - w / 2, 0), W - w)))
cy0 = int(round(min(max(cy - h / 2, 0), H - h)))
w, h = int(round(w)), int(round(h))
OUT_W, OUT_H = 1536, 1024
s = OUT_W / w
cat = anh.crop((cx0, cy0, cx0 + w, cy0 + h)).resize((OUT_W, OUT_H), Image.LANCZOS)
cat.save(os.path.join(thu_muc, ten_ra))
khung_trong_cat = [round((x0 - cx0) * s), round((y0 - cy0) * s), round((x1 - cx0) * s), round((y1 - cy0) * s)]
info = {"anh_goc": canh["anh"], "id": id_mon, "vung_cat_px": [cx0, cy0, cx0 + w, cy0 + h],
        "ti_le_phong": s, "kich_thuoc_gui": [OUT_W, OUT_H], "khung_mon_trong_anh_gui": khung_trong_cat}
json.dump(info, open(os.path.join(thu_muc, os.path.splitext(ten_ra)[0] + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(json.dumps(info, ensure_ascii=False))
