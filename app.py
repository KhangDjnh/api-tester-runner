import os
import json
import time
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import httpx

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "ui"

def generate_curl(method: str, url: str, headers: dict, json_data: any = None, params: dict = None) -> str:
    final_url = url
    if params and "?" not in url:
        from urllib.parse import urlencode
        qs = urlencode(params)
        if qs:
            final_url = f"{url}?{qs}"
    parts = [f"curl -X {method} '{final_url}'"]
    for k, v in headers.items():
        parts.append(f"-H '{k}: {v}'")
    if json_data is not None:
        parts.append(f"-d '{json.dumps(json_data, ensure_ascii=False)}'")
    return " \\\n    ".join(parts)

class APITesterHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Giảm log terminal
        return

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        req_path = url.path.lstrip("/")

        if req_path in ("", "index.html"):
            file_path = STATIC_DIR / "index.html"
        else:
            file_path = (STATIC_DIR / req_path).resolve()

        # Bảo vệ path traversal: file_path phải nằm trong STATIC_DIR
        try:
            file_path.relative_to(STATIC_DIR.resolve())
        except ValueError:
            self._send_json(403, {"error": "Forbidden"})
            return

        if file_path.is_file():
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type:
                mime_type = "application/octet-stream"
            if mime_type.startswith("text/") or "javascript" in mime_type or mime_type == "application/json":
                mime_type += "; charset=utf-8"

            with open(file_path, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        self._send_json(404, {"error": "Not Found"})

    def do_HEAD(self):
        self.do_GET()


    def do_POST(self):
        url = urlparse(self.path)

        if url.path == "/api/run-batch":
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length)
            
            try:
                data = json.loads(raw_body.decode("utf-8"))
            except Exception as e:
                self._send_json(400, {"error": f"Invalid JSON payload: {str(e)}"})
                return

            method = data.get("method", "POST").upper()
            target_url = data.get("url", "").strip()
            params = data.get("params", {})
            headers = data.get("headers", {})
            auth_type = data.get("authType", "none")
            auth_token = data.get("authToken", "").strip()
            payloads = data.get("payloads", [])

            if not target_url:
                self._send_json(400, {"error": "URL API không được để trống"})
                return

            # Cấu hình Headers & Authorization
            req_headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            req_headers.update(headers)

            if auth_type == "bearer" and auth_token:
                req_headers["Authorization"] = f"Bearer {auth_token}"
            elif auth_type == "apikey" and auth_token:
                req_headers["X-API-KEY"] = auth_token

            # Thực thi batch từng payload tuần tự
            results = []
            
            # Đảm bảo payloads luôn là 1 list
            if not isinstance(payloads, list):
                payloads = [payloads]
            if len(payloads) == 0:
                payloads = [{}]

            client = httpx.Client(timeout=15.0, follow_redirects=True)

            try:
                for idx, item in enumerate(payloads, start=1):
                    # Kiểm tra xem item là Test Case Object hay Raw Payload
                    if isinstance(item, dict) and ("payload" in item or "testCaseId" in item or "expectedStatus" in item):
                        test_case_id = item.get("testCaseId", f"TC{idx:02d}")
                        description = item.get("description", "")
                        expected_status = item.get("expectedStatus", None)
                        actual_payload = item.get("payload", {})
                    else:
                        test_case_id = f"TC{idx:02d}"
                        description = ""
                        expected_status = None
                        actual_payload = item

                    # Tránh nhân đôi query parameters nếu target_url đã chứa sẵn query string từ UI
                    req_params = None if ("?" in target_url) else (params if params else None)

                    # Sinh cURL command từ actual_payload
                    curl_cmd = generate_curl(method, target_url, req_headers, actual_payload if method != "GET" else None, req_params)
                    start_time = time.perf_counter()
                    
                    try:
                        if method == "GET":
                            resp = client.request(method=method, url=target_url, params=req_params, headers=req_headers)
                        else:
                            resp = client.request(method=method, url=target_url, params=req_params, headers=req_headers, json=actual_payload)
                        
                        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                        try:
                            resp_data = resp.json()
                        except Exception:
                            resp_data = resp.text

                        # Đánh giá PASS / FAIL:
                        # Nếu có expectedStatus thì kiểm tra resp.status_code == expectedStatus
                        # Nếu không có expectedStatus thì mặc định là HTTP 2xx
                        if expected_status is not None:
                            try:
                                is_passed = (int(resp.status_code) == int(expected_status))
                            except (ValueError, TypeError):
                                is_passed = False
                        else:
                            is_passed = (200 <= resp.status_code < 300)

                        results.append({
                            "stt": idx,
                            "test_case_id": test_case_id,
                            "description": description,
                            "expected_status": expected_status,
                            "passed": is_passed,
                            "success": is_passed,
                            "payload": actual_payload,
                            "status_code": resp.status_code,
                            "status_text": resp.reason_phrase if hasattr(resp, "reason_phrase") else "OK",
                            "elapsed_ms": elapsed_ms,
                            "headers": dict(resp.headers),
                            "response": resp_data,
                            "curl": curl_cmd
                        })
                    except Exception as req_err:
                        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                        results.append({
                            "stt": idx,
                            "test_case_id": test_case_id,
                            "description": description,
                            "expected_status": expected_status,
                            "passed": False,
                            "success": False,
                            "payload": actual_payload,
                            "status_code": 0,
                            "status_text": "Connection Error",
                            "elapsed_ms": elapsed_ms,
                            "headers": {},
                            "response": {"error": str(req_err)},
                            "curl": curl_cmd
                        })
            finally:
                client.close()

            passed_count = sum(1 for r in results if r["passed"])
            failed_count = sum(1 for r in results if not r["passed"])

            self._send_json(200, {
                "total": len(results),
                "passed_count": passed_count,
                "failed_count": failed_count,
                "success_count": passed_count,
                "results": results
            })
            return

        if url.path == "/api/auth-login":
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length)
            try:
                data = json.loads(raw_body.decode("utf-8"))
            except Exception as e:
                self._send_json(400, {"error": f"Invalid JSON payload: {str(e)}"})
                return

            login_url = data.get("loginUrl", "http://localhost:8081/v1/auth/login").strip()
            username = data.get("username", "cbnv4")
            password = data.get("password", "1")
            initial_cookie = data.get("cookie", "").strip()

            req_headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            if initial_cookie:
                req_headers["Cookie"] = initial_cookie

            login_payload = {
                "username": username,
                "password": password
            }

            client = httpx.Client(timeout=15.0, follow_redirects=True)
            try:
                resp = client.post(login_url, headers=req_headers, json=login_payload)
                
                # Trích xuất cookie từ response Set-Cookie hoặc client cookies
                cookies_list = []
                for k, v in resp.cookies.items():
                    cookies_list.append(f"{k}={v}")
                
                # Nếu httpx client cookies rỗng, thử bóc tách từ header 'set-cookie'
                if not cookies_list:
                    set_cookie_raw = resp.headers.get("set-cookie", "")
                    if set_cookie_raw:
                        # Lấy phần trước dấu ';'
                        first_part = set_cookie_raw.split(";")[0].strip()
                        if first_part:
                            cookies_list.append(first_part)

                final_cookie = "; ".join(cookies_list) if cookies_list else initial_cookie

                # Bóc tách csrf_token
                csrf_token = None
                resp_json = None
                try:
                    resp_json = resp.json()
                    if isinstance(resp_json, dict):
                        content_dict = resp_json.get("content") or {}
                        if isinstance(content_dict, dict):
                            csrf_token = content_dict.get("csrf_token")
                except Exception:
                    resp_json = resp.text

                self._send_json(200, {
                    "success": 200 <= resp.status_code < 300,
                    "status_code": resp.status_code,
                    "csrf_token": csrf_token,
                    "cookie": final_cookie,
                    "headers": dict(resp.headers),
                    "response": resp_json
                })
            except Exception as req_err:
                self._send_json(500, {
                    "success": False,
                    "error": str(req_err)
                })
            finally:
                client.close()
            return


        self._send_json(404, {"error": "Endpoint not found"})


def run_app(port: int = 5050):
    server = HTTPServer(("0.0.0.0", port), APITesterHandler)
    print(f"=====================================================")
    print(f"🚀 UI API Batch Tester đã khởi động thành công!")
    print(f"👉 Truy cập giao diện: http://127.0.0.1:{port}")
    print(f"=====================================================")
    server.serve_forever()

if __name__ == "__main__":
    run_app()
