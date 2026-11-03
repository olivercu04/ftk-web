# ftk-web

Trang giới thiệu **FTK — Furniture Tool Kit**, app Windows dựng phòng nội thất 3D bằng kéo thả. Trang tĩnh (HTML, CSS, JS thuần), chạy trên GitHub Pages từ thư mục gốc repo.

## Sửa tên, link, cờ

Mọi thứ cần sửa nằm trong `config.js`; mỗi khoá có một dòng chú thích ngay trên nó.

| Khoá | Việc |
|---|---|
| `APP_NAME` | Tên đầy đủ: `<title>` và chân trang |
| `APP_SHORT` | Tên ngắn "FTK": thanh island, hỏi đáp, bản quyền |
| `TAGLINE` | Câu mô tả trang (meta description). Thẻ chia sẻ `og:*` / `twitter:card` nằm cứng trong `<head>` của `index.html`: `og:title` theo `APP_NAME`, còn `og:url` và `og:description` sửa tay |
| `SIGNUP_URL` | Link form đăng ký. Trống: nút "Đăng ký dùng thử" cuộn tới mục Liên hệ |
| `CONTACT_EMAIL`, `ZALO_URL`, `FACEBOOK_URL` | Kênh ở mục Liên hệ. Trống: ẩn ô của kênh đó; cả 4 kênh (kể cả `SIGNUP_URL`) trống thì mục Liên hệ hiện nút "Sắp mở đăng ký" |
| `YOUTUBE_ID` | Mã video YouTube. Trống: không có ô video |
| `SHOW_AI_TEASER` | `true`: hiện khối "sắp có" (`#ai-sap-co`) và mục menu |
| `SHOW_ANH_APP` | `true`: hiện ảnh giao diện app và khối "Xem thao tác" |
| `PAGE_VERSION` | Số phiên bản, dùng để trình duyệt tải lại file mới |
| `MEDIA` | Đường dẫn, alt và chú thích của ảnh nội dung |

Link phải bắt đầu bằng `https://`.

## Đổi PAGE_VERSION

Đổi `PAGE_VERSION` trong `config.js`, rồi đổi số sau `?v=` ở ba dòng trong phần `<head>` của `index.html`:

- `<link rel="stylesheet" href="style.css?v=…">`
- `<script src="config.js?v=…">`
- `<script src="main.js?v=…">`

Mã 3D (`js/xt-app.js`) và khối Ảnh AI (`anh-ai/ftk_viewport.css`, `.js`, `du_lieu.json`) tự lấy số từ `PAGE_VERSION`, không cần sửa thêm.

## Khối Ảnh AI (`#anh-ai`)

Thư mục `anh-ai/` là bản sinh ra từ gói bàn giao của phiên làm ảnh AI: **không sửa tay** `ftk_viewport.*`, `du_lieu.json` hay ảnh. Cần đổi thì xuất gói mới, chép đè cả thư mục `anh-ai/`, rồi tăng `PAGE_VERSION`. Chữ trong khối nằm ở `index.html`, CSS bọc ngoài ở `style.css` (mục `#anh-ai`), mã nạp lười ở `main.js` (mục "Khối Ảnh AI").

## Bật lại phần ảnh app

Khi có clip quay thật, đặt `SHOW_ANH_APP: true` trong `config.js`. Ảnh ở đầu trang, khối "Xem thao tác" và mục menu "Thao tác" sẽ hiện; nút đầu trang đổi thành "Xem thao tác".

## Chạy thử trên máy

Trong thư mục repo:

```
python3 -m http.server 8000
```

rồi mở `http://localhost:8000/`. Không mở bằng cách bấm đúp `index.html` (trình duyệt chặn nạp module từ `file://`).

## Thư viện

three.js nằm sẵn trong `vendor/three/`; trang không tải script nào từ máy chủ ngoài (chỉ phông Be Vietnam Pro lấy từ Google Fonts). Nguồn và giấy phép: `credits.md`.
