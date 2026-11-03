# Bàn giao — khối "Ảnh AI" cho trang ftk-web

**Lập:** 03/11/2026 09:01 · **Từ:** phiên làm web ảnh AI (repo `D:\AI_Tools\GitHub\FTK_AI_Server` trên máy cuhoang — chưa lên GitHub) · **Cho:** phiên làm trang `olivercu04/ftk-web` · cuhoang quyết 03/11: phần gắn vào trang do phiên ftk-web làm tiếp.

## Khối này là gì
Phòng mẫu "Ảnh AI · thử nghiệm": ảnh nội thất do AI vẽ theo mô tả, rê chuột thấy từng món, bấm chọn món, xem 3 bản dựng sẵn (ảnh đầu → sofa đổi nhung navy → mặt bàn đổi gỗ óc chó). Viền món lấy từ mô hình SAM (sát mép).
- **Không** phải `#ai-sap-co` — khối đó là "AI bày đồ" qua MCP trong Unreal (việc khác). Khối này là khối MỚI `#anh-ai`.
- Trang tĩnh, không có máy chủ AI: ô "gửi yêu cầu" chỉ chuyển sang bản dựng sẵn khớp món (sofa → v1, bàn trà → v2); món khác → báo "thử chọn sofa hoặc bàn trà". Khối ghi rõ "kết quả dựng sẵn" — giữ câu này (không để khách tưởng AI đang chạy thật).

## Trong gói (385 879 B)
| Tệp | Việc |
|---|---|
| `khoi_anh_ai.html` | Đoạn dán vào `index.html`: `<section id="anh-ai">` + `<link>` CSS + `<style>` bọc ngoài + `<script>` nạp lười |
| `anh-ai/ftk_viewport.js` · `ftk_viewport.css` | Thành phần xem ảnh (lớp `FtkViewport`, nguồn tĩnh `FtkNguon.Tinh`) |
| `anh-ai/du_lieu.json` | Phòng gọn (3 bản, 10 món, không có đa giác / mô tả nội bộ) + bảng món → bản dựng sẵn |
| `anh-ai/anh/v0…v2.webp` · `v0…v2_id.png` | Ảnh 1200 × 800 + bản đồ "pixel thuộc món nào" (rê chuột đọc cái này) |

## Cách gắn
1. Chép thư mục `anh-ai/` vào gốc repo (cạnh `index.html`) — đường dẫn trong khối là tương đối `anh-ai/…`.
2. Dán nội dung `khoi_anh_ai.html` vào `index.html` ở chỗ trang thấy hợp (gợi ý: sau `#xem-thu`, trước `#tinh-nang`). Thêm mục menu `<a href="#anh-ai">Ảnh AI</a>` nếu muốn.
3. Class `section · container · sec-head · eyebrow · h2 · sec-lead · data-reveal` lấy theo demo-v5 — kiểm còn đúng tên trong `style.css` / `main.js` hiện tại, đổi theo trang nếu khác.
4. Màu: `ftk_viewport.css` đọc token của trang (`--bg --text --text-2 --text-3 --accent --accent-txt --fill-a --fill-b --lg-tint-3d --lg-edge --lg-shadow --ease --f-body`) — trùng tên `style.css` hiện tại, không cần chỉnh.
5. Nạp lười: JS + JSON + ảnh chỉ tải khi khối cách màn hình 400 px; không tải gì từ máy ngoài.
6. Bộ đệm: GitHub Pages giữ tệp ~10 phút. Khi thay gói mới cùng tên tệp, nối `?v=` theo cách trang đang làm (`PAGE_VERSION`) cho `ftk_viewport.css` / `.js` / `du_lieu.json`.
7. Ảnh do AI (ChatGPT) vẽ theo mô tả của FTK — ghi vào `credits.md` nếu trang liệt kê nguồn ảnh.

## Được sửa / không được sửa
- Sửa thoải mái: chữ trong khối, CSS bọc ngoài (`#anh-ai …`), vị trí khối, mục menu.
- Không sửa tay: `anh-ai/ftk_viewport.*`, `du_lieu.json`, ảnh — là bản SINH RA. Cần đổi (lỗi hiển thị, thêm phòng mẫu, đổi ảnh) → báo cuhoang để phiên FTK_AI_Server sửa nguồn rồi xuất gói lại: `python cong_cu/dung_demo.py --goi <thu_muc_moi>`.

## Đã kiểm / chưa kiểm (03/11)
- Đã: trang thử giả lập token ftk-web chạy bằng `python -m http.server` — tải đủ 4 tệp chính + 6 ảnh mã 200, ảnh đúng loại, 1200 × 800; dữ liệu 3 bản / 10 món / 2 bản dựng sẵn. Cùng thành phần đã soi bằng mắt trong `demo-v6.html` + web chạy máy (rê gối → sofa, chậu → cây, khe tay đèn → nền).
- **Chưa:** soi bằng mắt CHÍNH gói này trong trang thật (cửa sổ máy lúc thử bị thu nhỏ). Bên ftk-web cần soi ở 1440 + 390: ảnh hiện, rê / bấm / gửi yêu cầu / ◀ ▶, cuộn qua khối không kẹt, điện thoại không cuộn ngang.
