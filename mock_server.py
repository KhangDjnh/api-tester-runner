import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

class MockEchoHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/health":
            self._send_json(200, {"status": "UP"})
            return
        self._send_json(200, {"message": "Echo server running", "path": url.path})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            body = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except Exception:
            body = raw_body.decode("utf-8", errors="ignore")

        self._send_json(200, {
            "code": "00",
            "message": "Success",
            "received_payload": body
        })

def run_mock_server(port: int = 8000) -> HTTPServer:
    server = HTTPServer(("127.0.0.1", port), MockEchoHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8000), MockEchoHandler)
    print("Mock Echo Server running at http://127.0.0.1:8000 (Ctrl+C to stop)...")
    server.serve_forever()
