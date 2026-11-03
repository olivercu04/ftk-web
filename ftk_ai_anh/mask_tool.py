# Vẽ mask đa giác từng món → mask PNG / món + ảnh ID + ảnh phủ màu để soát + JSON cảnh.
# Dùng: python mask_tool.py <thu_muc_phien> <ten_anh> <file_poly.json> <ten_canh_ra>
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

thu_muc, ten_anh, file_poly, ten_canh = sys.argv[1:5]
anh = Image.open(os.path.join(thu_muc, ten_anh)).convert("RGB")
W, H = anh.size
poly = json.load(open(file_poly, encoding="utf-8"))
mau = [(255, 64, 64), (64, 160, 255), (64, 220, 120), (255, 200, 40), (200, 90, 255),
       (255, 120, 200), (40, 220, 220), (255, 150, 60), (150, 255, 60), (120, 120, 255)]

os.makedirs(os.path.join(thu_muc, "mask"), exist_ok=True)
phu = anh.copy().convert("RGBA")
lop = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ve = ImageDraw.Draw(lop)
id_map = Image.new("L", (W, H), 0)          # 0 = nền; k = món thứ k theo thứ tự z (sau đè trước)
ve_id = ImageDraw.Draw(id_map)
mon_ra = []
for k, m in enumerate(poly["mon"], start=1):  # thứ tự z: đầu danh sách = dưới cùng
    pts = [tuple(p) for p in m["poly"]]
    mk = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mk).polygon(pts, fill=255)
    mk.save(os.path.join(thu_muc, "mask", f"{m['id']}.png"))
    ve_id.polygon(pts, fill=k)
    c = mau[(k - 1) % len(mau)]
    ve.polygon(pts, fill=c + (70,), outline=c + (255,), width=3)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    mon_ra.append({**{kk: vv for kk, vv in m.items() if kk != "poly"},
                   "z": k, "khung_px": [min(xs), min(ys), max(xs), max(ys)],
                   "poly_px": m["poly"], "mask": f"mask/{m['id']}.png"})
phu = Image.alpha_composite(phu, lop)
dv = ImageDraw.Draw(phu)
try:
    font = ImageFont.truetype("arial.ttf", 22)
except OSError:
    font = ImageFont.load_default()
for m in mon_ra:
    x0, y0, _, _ = m["khung_px"]
    dv.text((x0 + 4, y0 + 4), m["id"], fill=(255, 255, 255, 255), font=font, stroke_width=3, stroke_fill=(0, 0, 0, 255))
phu.convert("RGB").save(os.path.join(thu_muc, "soat_mask.jpg"), quality=88)
id_map.save(os.path.join(thu_muc, "mask", "_id_map.png"))

canh = {"khuon": "ftk-canh-v0", "phien_ban": poly.get("phien_ban", "v0"), "anh": ten_anh,
        "kich_thuoc_px": [W, H], "nguon_prompt": poly.get("nguon_prompt"),
        "ghi_chu_mask": poly.get("ghi_chu_mask"), "mon": mon_ra}
json.dump(canh, open(os.path.join(thu_muc, ten_canh), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("xong:", len(mon_ra), "mon ->", ten_canh, "+ mask/ + soat_mask.jpg")
