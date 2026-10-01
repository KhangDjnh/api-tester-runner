import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Dữ liệu giả lập
BRANCHES_DB = [
    {"id": "BR001", "code": "MB_HO", "name": "Hội sở chính MB Bank", "address": "Số 63 Lê Văn Lương, Cầu Giấy, Hà Nội", "city_code": "HN", "phone": "1900545426", "is_active": True},
    {"id": "BR002", "code": "MB_DDA", "name": "Chi nhánh Đống Đa", "address": "123 Xã Đàn, Đống Đa, Hà Nội", "city_code": "HN", "phone": "02437778888", "is_active": True},
    {"id": "BR003", "code": "MB_SGN", "name": "Chi nhánh Sài Gòn", "address": "259 Trần Hưng Đạo, Q1, TP.HCM", "city_code": "HCM", "phone": "02838889999", "is_active": True},
    {"id": "BR004", "code": "MB_BTH", "name": "Chi nhánh Bình Thạnh", "address": "45 Điện Biên Phủ, Bình Thạnh, TP.HCM", "city_code": "HCM", "phone": "02835556666", "is_active": False},
]

class MockServerHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Tắt bớt log mặc định để tránh ồn terminal
        return

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, status: int, html_str: str):
        body = html_str.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)

        # UI Demo Page (cho Playwright test UI)
        if url.path in ("/", "/login"):
            html = """
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="utf-8"><title>Hệ Thống CMS - Đăng Nhập</title></head>
            <body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
                <form id="login-form" style="border: 1px solid #ccc; padding: 24px; border-radius: 8px;">
                    <h2>CMS Quản Trị Chi Nhánh</h2>
                    <div><input id="username" placeholder="Tên đăng nhập" style="margin-bottom:8px; width:100%; padding:8px;" /></div>
                    <div><input id="password" type="password" placeholder="Mật khẩu" style="margin-bottom:8px; width:100%; padding:8px;" /></div>
                    <button id="btn-submit" type="button" onclick="login()" style="width:100%; padding:8px; background:#004b91; color:white; border:none; cursor:pointer;">Đăng Nhập</button>
                    <div id="status-msg" style="margin-top:12px; font-weight:bold;"></div>
                </form>
                <script>
                    function login() {
                        const u = document.getElementById('username').value;
                        const p = document.getElementById('password').value;
                        const msg = document.getElementById('status-msg');
                        if (u === 'admin' && p === 'Admin@123') {
                            msg.style.color = 'green';
                            msg.innerText = 'Đăng nhập thành công! Chuyển hướng...';
                        } else {
                            msg.style.color = 'red';
                            msg.innerText = 'Sai tài khoản hoặc mật khẩu!';
                        }
                    }
                </script>
            </body>
            </html>
            """
            self._send_html(200, html)
            return

        if url.path == "/api/v1/health":
            self._send_json(200, {"status": "UP", "version": "1.0.0"})
            return

        self._send_json(404, {"code": "404", "message": "Not Found"})

    def do_POST(self):
        url = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except Exception:
            self._send_json(400, {"code": "400", "message": "Malformed JSON"})
            return

        # Check Token bảo mật (Auth check)
        auth = self.headers.get("Authorization", "")
        if url.path.startswith("/api/v1/branches"):
            if not auth or "Bearer test-secret-token-123456" not in auth:
                self._send_json(401, {"code": "401", "message": "Unauthorized - Missing or invalid token"})
                return

        # Search Branch Endpoint
        if url.path == "/api/v1/branches/search":
            page = body.get("page", 1)
            page_size = body.get("page_size", 10)

            # Validate input boundaries
            if not isinstance(page, int) or page < 1:
                self._send_json(400, {"code": "INVALID_PAGE", "message": "page must be integer >= 1"})
                return
            if not isinstance(page_size, int) or page_size < 1 or page_size > 100:
                self._send_json(400, {"code": "INVALID_PAGE_SIZE", "message": "page_size must be between 1 and 100"})
                return

            keyword = (body.get("keyword") or "").lower()
            city = body.get("city_code")

            results = [
                b for b in BRANCHES_DB
                if (not keyword or keyword in b["name"].lower() or keyword in b["address"].lower())
                and (not city or b["city_code"] == city)
            ]

            start_idx = (page - 1) * page_size
            paginated = results[start_idx : start_idx + page_size]

            self._send_json(200, {
                "code": "00",
                "message": "Success",
                "total": len(results),
                "page": page,
                "page_size": page_size,
                "data": paginated
            })
            return

        self._send_json(404, {"code": "404", "message": "Endpoint not found"})


def run_mock_server(port: int = 8000) -> HTTPServer:
    server = HTTPServer(("127.0.0.1", port), MockServerHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8000), MockServerHandler)
    print("Mock Server running at http://127.0.0.1:8000 (Ctrl+C to stop)...")
    server.serve_forever()
