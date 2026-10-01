import os
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import httpx

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "ui"

def generate_curl(method: str, url: str, headers: dict, json_data: any = None) -> str:
    parts = [f"curl -X {method} '{url}'"]
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

        if url.path in ("/", "/index.html"):
            index_path = STATIC_DIR / "index.html"
            if index_path.exists():
                with open(index_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self._send_json(404, {"error": "UI index.html not found"})
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
                for idx, payload in enumerate(payloads, start=1):
                    # Sinh cURL command
                    curl_cmd = generate_curl(method, target_url, req_headers, payload if method != "GET" else None)
                    start_time = time.perf_counter()
                    
                    try:
                        if method == "GET":
                            resp = client.request(method=method, url=target_url, params=params, headers=req_headers)
                        else:
                            resp = client.request(method=method, url=target_url, params=params, headers=req_headers, json=payload)
                        
                        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                        try:
                            resp_data = resp.json()
                        except Exception:
                            resp_data = resp.text

                        results.append({
                            "stt": idx,
                            "payload": payload,
                            "status_code": resp.status_code,
                            "status_text": resp.reason_phrase if hasattr(resp, "reason_phrase") else "OK",
                            "elapsed_ms": elapsed_ms,
                            "response": resp_data,
                            "curl": curl_cmd,
                            "success": 200 <= resp.status_code < 300
                        })
                    except Exception as req_err:
                        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                        results.append({
                            "stt": idx,
                            "payload": payload,
                            "status_code": 0,
                            "status_text": "Connection Error",
                            "elapsed_ms": elapsed_ms,
                            "response": {"error": str(req_err)},
                            "curl": curl_cmd,
                            "success": False
                        })
            finally:
                client.close()

            self._send_json(200, {
                "total": len(results),
                "success_count": sum(1 for r in results if r["success"]),
                "failed_count": sum(1 for r in results if not r["success"]),
                "results": results
            })
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
