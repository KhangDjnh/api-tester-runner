# Framework Tự Động Hóa Kiểm Thử API & UI (Python 3.12 + Pytest)

Hệ thống kiểm thử tự động hóa giải quyết triệt để bài toán: **"Test lại toàn bộ API và kịch bản biên sau mỗi module mà không tốn thời gian test tay"**.

---

## ⚡ Các Điểm Nổi Bật

1. **Siêu Nhanh & Tự Động**: Chạy hơn 11 test cases cả API và UI chỉ trong **dưới 1 giây**.
2. **Data-Driven Testing (`@pytest.mark.parametrize`)**: Định nghĩa bảng ma trận test case biên (boundary values, invalid data types, missing params). **1 hàm test tự sinh ra 10 - 50 test case**.
3. **Contract Validation (Pydantic V2)**: Tự động kiểm tra cấu trúc JSON response khớp chính xác với DTO / Schema quy định.
4. **Auto-cURL Debugger**: Nếu test case bị fail, hệ thống tự động sinh câu lệnh `curl` hoàn chỉnh để bạn copy chạy debug ngay lập tức.
5. **Giao Diện Báo Cáo HTML Trực Quan**: Tích hợp `pytest-html`, tự sinh file báo cáo HTML chi tiết sau mỗi lần chạy.
6. **Kiểm Thử UI Bằng Playwright**: Hỗ trợ test giao diện Web/CMS tự động, chụp ảnh màn hình khi có lỗi.

---

## 📂 Cấu Trúc Dự Án

```
api-testing/
├── core/
│   ├── api_client.py       # Wrapper HTTP Client (đo latency, auto cURL, assert status)
│   └── config.py           # Quản lý cấu hình môi trường (.env)
├── data/
│   └── schemas.py          # Pydantic Schemas để validate hợp đồng API
├── tests/
│   ├── conftest.py         # Pytest fixtures dùng chung (client, auth, html hooks)
│   ├── api/
│   │   └── test_branches.py # Test suite API: Happy path, ma trận validate, phân quyền
│   └── ui/
│       └── test_cms_ui.py  # Test suite UI giao diện bằng Playwright
├── reports/
│   └── test_report.html    # Báo cáo kết quả trực quan dạng HTML
├── .env                    # Biến môi trường (URL, Token, Timeout...)
├── pytest.ini              # Cấu hình Pytest và markers
├── mock_server.py          # Server giả lập sẵn sàng chạy demo tức thì
├── run_tests.py            # Script chạy test tiện lợi
└── requirements.txt        # Danh sách thư viện
```

---

## 🚀 Hướng Dẫn Sử Dụng

### 1. Kích hoạt môi trường ảo
```bash
source .venv/bin/activate
```

### 2. Chạy kiểm thử

| Nhu cầu kiểm thử | Lệnh thực thi |
| :--- | :--- |
| **Chạy toàn bộ (API + UI) và sinh báo cáo HTML** | `python run_tests.py` |
| **Chỉ chạy kiểm thử API** | `python run_tests.py --api` |
| **Chỉ chạy kiểm thử UI (Playwright)** | `python run_tests.py --ui` |
| **Chạy UI test có mở cửa sổ trình duyệt (Headed)** | `python run_tests.py --ui --headed` |
| **Chạy nhanh các kịch bản quan trọng (Smoke Test)** | `python run_tests.py --smoke` |
| **Chạy với Backend thật của bạn (không bật Mock)** | `python run_tests.py --no-mock` |

Hoặc chạy trực tiếp bằng lệnh `pytest`:
```bash
pytest
pytest -m api
pytest -m ui
```

---

## 🌐 Xem Báo Cáo Kết Quả Trực Quan (HTML Report)

Sau khi chạy xong, mở file báo cáo trên trình duyệt:
```bash
xdg-open reports/test_report.html
# Hoặc mở trực tiếp file:
# file:///home/khangdv/personal-project/api-testing/reports/test_report.html
```

---

## 🔧 Kết Nối Đến API Server Thật

Mở file [.env](file:///home/khangdv/personal-project/api-testing/.env) và cập nhật đường dẫn server của bạn:

```ini
BASE_URL=http://localhost:8080
API_PREFIX=/api/v1
AUTH_TOKEN=your_jwt_or_bearer_token_here
```

Sau đó chạy lệnh:
```bash
python run_tests.py --no-mock --api
```
