/* Cấu hình trang FTK. Sửa file này để đổi tên, link, bật/tắt khối; không cần đụng index.html / main.js.
   Đổi PAGE_VERSION thì đổi cả ?v= ở 3 thẻ trong index.html (xem README.md). */
window.FTK_CONFIG = {
  // Tên đầy đủ của app: vào <title> và chân trang. Để trống: giữ chữ có sẵn trong index.html.
  APP_NAME: 'FTK — Furniture Tool Kit',
  // Tên ngắn: chữ trên thanh island, câu hỏi đáp và dòng bản quyền. Để trống: giữ chữ có sẵn.
  APP_SHORT: 'FTK',
  // Câu mô tả trang (thẻ meta description, hiện trên kết quả tìm kiếm). Để trống: giữ câu có sẵn.
  TAGLINE: 'Kéo đồ từ kho vào phòng 3D, thay mẫu tại chỗ, chọn vùng rồi bấm mẫu để đổi vật liệu. App Windows cho người thiết kế và tư vấn nội thất.',

  // Link form đăng ký (bắt đầu bằng https://). Có: mọi nút "Đăng ký dùng thử" mở link ở tab mới. Để trống: nút cuộn tới mục Liên hệ. Cả 4 kênh liên hệ (form, email, Zalo, Facebook) trống: mục Liên hệ hiện nút "Sắp mở đăng ký"; có ít nhất 1 kênh: chỉ hiện ô của kênh có giá trị.
  SIGNUP_URL: '',
  // Email liên hệ. Có: hiện ở mục Liên hệ dạng mailto. Để trống: không hiện ô này.
  CONTACT_EMAIL: '',
  // Link Zalo (https://). Có: hiện "Nhắn qua Zalo". Để trống: không hiện ô này.
  ZALO_URL: '',
  // Link trang Facebook (https://). Có: hiện "Trang Facebook". Để trống: không hiện ô này.
  FACEBOOK_URL: '',
  // Mã video YouTube (chỉ phần mã, vd dQw4w9WgXcQ). Có: thêm ô "Video giới thiệu" ngay sau khối 3D. Để trống: không có ô video, không gửi request nào.
  YOUTUBE_ID: '',

  // true: hiện khối "sắp có" (và mục menu "Sắp có"). false: ẩn hẳn.
  SHOW_AI_TEASER: false,
  // true: hiện ảnh giao diện app ở đầu trang, khối "Xem thao tác" và mục menu "Thao tác". false: ẩn, ảnh không được tải. Bật khi có clip quay thật.
  SHOW_ANH_APP: false,
  // Số phiên bản trang. Khi đổi, đổi cả ?v= trong index.html (style.css, config.js, main.js); mã 3D tự lấy số này.
  PAGE_VERSION: '2',

  // Ảnh nội dung. Trong index.html ảnh là <img data-media="khoá">; main.js điền src, alt, chú thích từ đây.
  // nguon: 'that' = ảnh chụp từ app · 'tam' = ảnh tạm (chú thích "Ảnh minh hoạ", ghi nguồn ở credits.md).
  MEDIA: {
    // Mục Người dùng (ảnh tạm, Pexels 6758771)
    'nguoi-dung': { kind: 'anh', src: 'media/nguoi-dung-09.webp', nguon: 'tam', alt: 'Phòng ăn và phòng khách liền nhau: bàn đá dài với ghế bọc vải, tủ bếp gỗ, đèn thả và đèn rọi trần.', chu_thich: 'Ảnh minh hoạ' },
    // Đầu trang (chỉ khi SHOW_ANH_APP bật)
    'ui-tong-quan': { kind: 'anh', src: 'media/ui-tong-quan.webp', nguon: 'that', alt: 'Giao diện app: phòng 3D màu trắng, một bàn tròn đang được chọn có viền sáng và gizmo 3 trục; kho đồ mở ở góc dưới bên trái.', chu_thich: 'Ảnh chụp từ app' },
    // Xem thao tác, bước 1 (chỉ khi SHOW_ANH_APP bật)
    'tt-01': { kind: 'anh', src: 'media/tt-01-kho.webp', nguon: 'that', alt: 'Kho đồ ở tab vật liệu: cột thư mục bên trái, ô tìm kiếm phía trên, lưới thẻ vật liệu có ảnh mẫu, mỗi thẻ có nút đổi và nút thả tim.', chu_thich: 'Ảnh chụp từ app' },
    // Xem thao tác, bước 6 (chỉ khi SHOW_ANH_APP bật)
    'tt-02': { kind: 'anh', src: 'media/tt-02-phong.webp', nguon: 'that', alt: 'Giao diện app: kho đồ mở ở tab vật liệu phía dưới bên trái, một bàn tròn đang được chọn ở bên phải phòng 3D.', chu_thich: 'Ảnh chụp từ app' },
    // Xem thao tác, bước 3 (chỉ khi SHOW_ANH_APP bật)
    'tt-03': { kind: 'anh', src: 'media/tt-03-gizmo.webp', nguon: 'that', alt: 'Cận cảnh bàn tròn đang được chọn, viền sáng quanh bàn, gizmo di chuyển hiện 3 trục mũi tên xanh dương, đỏ và xanh lá.', chu_thich: 'Ảnh chụp từ app' }
  }
};
