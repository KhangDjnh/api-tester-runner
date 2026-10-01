# API Batch Tester & Automation Runner (Python 3.12 + Web UI + Pytest)

Hệ thống kiểm thử API hàng loạt chuyên nghiệp, kết hợp toàn diện giữa **Giao diện Web trực quan (Web UI Runner)** và **Framework tự động hóa (Pytest)**. 

Giải quyết triệt để bài toán: **"Kiểm thử hàng chục kịch bản biên, kịch bản hợp lệ và kịch bản lỗi của API cùng lúc chỉ với 1 click, tự động đối soát kết quả và đồng bộ dữ liệu thông minh"**.

---

## ⚡ Các Tính Năng Nổi Bật

### 🌐 1. Web UI Batch Tester Runner (`http://127.0.0.1:5050`)
- **Multi-Payload & Test Case Engine**: Chạy tuần tự danh sách hàng chục test cases, đo đạc độ trễ (latency ms) và ghi nhận kết quả chi tiết từng request.
- **Cấu trúc Test Case chuẩn hóa**:
  - Hỗ trợ mảng các object gồm `testCaseId`, `description`, `expectedStatus`, và `payload`.
  - Tự động đánh giá **`✓ PASSED`** / **`✗ FAILED`** dựa trên mã `expectedStatus` (hỗ trợ hoàn hảo cả Happy Path kỳ vọng 200 và Negative Cases kỳ vọng 400, 401, 403, 422...).
  - Vẫn tương thích ngược 100% nếu chỉ truyền vào mảng Raw Payload thuần `[{...}, {...}]`.
- **Dán cURL thông minh (Import cURL)**: Tự động phân tích câu lệnh `curl` từ Postman, Chrome DevTools hoặc tài liệu API để điền tự động Method, URL, Headers và trích xuất Payload.
- **Tự động đăng nhập CMS (Get Authentication)**: Gọi API đăng nhập, tự động trích xuất `csrf_token` và `cookie session` rồi lưu thẳng vào Biến Toàn Cục.
- **Quản lý Biến Toàn Cục (Global Variables `{{key}}`)**: Định nghĩa các biến dùng chung (token, cookie, base_url...) lưu trữ trong `localStorage`, tự động thay thế cú pháp `{{key}}` trong URL, Header, Param và Payload.
- **Post-Response JavaScript Script Engine**: Cho phép viết script JavaScript tự động chạy sau khi nhận phản hồi từ API (ví dụ: tự động lưu token mới, cập nhật biến toàn cục).
- **Cây JSON tương tác (Collapsible JSON Tree Viewer)**: Trình xem JSON đa cấp có cơ chế thu gọn/mở rộng từng node, mở rộng/thu gọn toàn bộ, giúp xem payload và response dài dễ dàng mà không bị tràn màn hình.
- **Phân tích & Điều hướng lỗi thông minh (Failure Analyzer)**:
  - Bấm vào nhãn **`FAILED`** để mở danh sách toàn bộ các test case thất bại kèm **Lý do chi tiết** (sai lệch mã HTTP, lỗi kết nối mạng, chi tiết thông báo lỗi từ server...).
  - Bấm vào test case bất kỳ trong danh sách lỗi sẽ **tự động cuộn mượt (smooth scroll)** đến đúng thẻ kết quả và kích hoạt hiệu ứng chớp sáng viền đỏ (`highlight-pulse`).
- **Chỉnh sửa Payload trực tiếp & Đồng bộ 2 chiều**:
  - Nút **`✏️ Sửa`** tại cột Payload cho phép sửa trực tiếp JSON payload ngay trên kết quả.
  - Khi nhấn **`💾 Lưu thay đổi`**, hệ thống tự động kiểm tra cú pháp, cập nhật cây JSON, tạo lại cURL và **đồng bộ tự động nội dung mới vào mảng JSON ở tab Body**.
- **Gửi lại từng request riêng lẻ (`▶ Send`)**: Bên cạnh nút chạy toàn bộ, mỗi kết quả đều có nút **`▶ Send`** riêng để gửi lại nhanh 1 request vừa chỉnh sửa mà không cần chạy lại cả batch.
- **Sao chép cURL (`Copy cURL`)**: Tạo câu lệnh cURL độc lập chuẩn xác cho từng request kèm thông báo toast xác nhận.

---

### 🧪 2. Framework Kiểm Thử Tự Động (Pytest CLI)
- **Data-Driven Testing (`@pytest.mark.parametrize`)**: Chạy ma trận test case hàng loạt từ file dữ liệu JSON hoặc template code.
- **Auto-cURL Debugger**: Tự động sinh câu lệnh cURL kèm theo chi tiết request khi có assertion lỗi để lập trình viên copy chạy debug ngay trong terminal.
- **Báo cáo HTML trực quan (`pytest-html`)**: Xuất báo cáo kết quả kiểm thử dạng HTML chi tiết và chuyên nghiệp.
- **Mock Server tích hợp**: Sẵn sàng khởi chạy Mock API Server phục vụ việc demo, viết test suite trước khi có backend thật.

---

## 📂 Cấu Trúc Dự Án

```
api-testing/
├── core/
│   ├── api_client.py          # Wrapper HTTP Client (đo latency, auto cURL, assert status)
│   └── config.py              # Quản lý cấu hình môi trường (.env)
├── data/
│   ├── test_cases.json        # Bộ 26 kịch bản kiểm thử mẫu (Happy path, boundary, negative)
│   └── schemas.py             # Pydantic Schemas để validate hợp đồng API
├── tests/
│   ├── conftest.py            # Pytest fixtures dùng chung
│   ├── api/
│   │   └── test_template.py   # Template kịch bản kiểm thử API tự động bằng Pytest
│   └── ui/                    # Thư mục dành cho test suite giao diện (Playwright)
├── ui/
│   ├── index.html             # Khung HTML giao diện (Semantic, gọn gàng ~260 dòng)
│   ├── css/                   # Hệ thống Style phân tán theo Module & Component
│   │   ├── main.css           # File tổng hợp import toàn bộ styles
│   │   ├── variables.css      # Design tokens, bảng màu, biến giao diện
│   │   ├── base.css           # Reset CSS, container, spinner utility
│   │   └── components/        # CSS theo từng khối (header, tabs, results, json-tree, modal)
│   └── js/                    # Logic JavaScript bóc tách theo miền nghiệp vụ
│       ├── app.js             # Bootstrap ứng dụng, khởi tạo & phím tắt (Ctrl+Enter, Esc)
│       ├── state.js           # Quản lý Biến toàn cục ({{key}}), lưu trữ LocalStorage
│       ├── runner.js          # Engine chạy Batch Test & Gửi lại từng request, edit inline
│       ├── json-viewer.js     # Trình hiển thị & thu gọn JSON cây (Collapsible Tree)
│       ├── url-sync.js        # Đồng bộ 2 chiều giữa URL Bar và Bảng Query Parameters
│       ├── curl-parser.js     # Phân tích lệnh cURL và sinh cURL command
│       ├── script-engine.js   # Bộ thực thi Post-response JavaScript sandbox
│       ├── ui-tabs.js         # Điều hướng Tabs, chỉnh chiều cao linh hoạt, bảng KV
│       ├── modals.js          # Xử lý Modal: Login CMS, Biến toàn cục, Import cURL, Failed TCs
│       ├── utils.js           # Các hàm tiện ích dùng chung (escapeHtml, copy, toast)
│       └── data/
│           └── default-cases.js # 26 kịch bản kiểm thử mẫu (phân tách khỏi HTML)
├── reports/
│   └── test_report.html       # Báo cáo kết quả kiểm thử Pytest (HTML Report)
├── app.py                     # HTTP Server backend điều phối chạy batch test và mock login
├── mock_server.py             # Server mock API chạy độc lập tại cổng 8000
├── run_ui.py                  # Script khởi động Giao diện Web Testing (cổng 5050)
├── run_tests.py               # Script thực thi Pytest CLI & tạo báo cáo
├── pytest.ini                 # Cấu hình Pytest markers
├── requirements.txt           # Danh sách thư viện Python phụ thuộc
└── .env                       # Cấu hình biến môi trường
```

---

## 🚀 Hướng Dẫn Sử Dụng

### 1. Kích hoạt môi trường ảo
```bash
source .venv/bin/activate
```

---

### 2. Khởi động Giao diện Web Testing (Khuyên dùng)

Chỉ cần chạy lệnh:
```bash
python run_ui.py
```
- Hệ thống sẽ tự động khởi động **Mock Server (cổng 8000)** và **Web UI Runner (cổng 5050)**.
- Trình duyệt sẽ tự động mở trang: **`http://127.0.0.1:5050`**.

---

### 3. Chạy kiểm thử tự động qua dòng lệnh (Pytest CLI)

| Nhu cầu kiểm thử | Lệnh thực thi |
| :--- | :--- |
| **Chạy kiểm thử và tự động mở báo cáo HTML** | `python run_tests.py --open-report` |
| **Chỉ chạy kịch bản API** | `python run_tests.py --api` |
| **Chạy với Backend thật (không bật mock server)** | `python run_tests.py --no-mock --api` |
| **Chạy trực tiếp bằng pytest** | `pytest` |

Xem báo cáo kết quả HTML bất cứ lúc nào:
```bash
xdg-open reports/test_report.html
```

---

## 📝 Cấu Trúc Mẫu Dữ Liệu Test Case trong Tab Body

Bạn có thể truyền trực tiếp mảng các test case vào tab **Body** trên giao diện:

```json
[
  {
    "testCaseId": "TC01_DEFAULT_EMPTY",
    "description": "Happy path - Payload rỗng, áp dụng phân trang mặc định",
    "expectedStatus": 200,
    "payload": {}
  },
  {
    "testCaseId": "TC02_FILTER_BY_CODE",
    "description": "Happy path - Lọc theo danh sách mã chi nhánh",
    "expectedStatus": 200,
    "payload": {
      "code": ["CN001", "PGD002"],
      "page": 1,
      "size": 10
    }
  },
  {
    "testCaseId": "TC03_NEGATIVE_INVALID_PAGE",
    "description": "Negative case - Vi phạm validation page = 0 (bị chặn 400)",
    "expectedStatus": 400,
    "payload": {
      "page": 0,
      "size": 10
    }
  }
]
```

---

## 🔧 Cấu Hình Kết Nối API Server Thật

Mở file [.env](file:///home/khangdv/personal-project/api-testing/.env) và cập nhật đường dẫn API thật của bạn:

```ini
BASE_URL=http://localhost:8081
API_PREFIX=/v1
AUTH_TOKEN=your_jwt_or_bearer_token_here
TIMEOUT=15.0
```

---

## 📦 Kho Lưu Trữ Mã Nguồn
- **Git Remote**: `git@github.com:KhangDjnh/api-tester-runner.git`
- **Branch chính**: `main`
