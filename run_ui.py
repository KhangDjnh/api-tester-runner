#!/usr/bin/env python3
import sys
import webbrowser
import threading
from mock_server import run_mock_server
from app import run_app

def main():
    print("🚀 Đang khởi động Mock API Server tại http://127.0.0.1:8000 ...")
    run_mock_server(8000)

    port = 5050
    print(f"🚀 Đang khởi động Giao diện Web Testing tại http://127.0.0.1:{port} ...")
    
    # Mở browser tự động sau 1 giây
    threading.Timer(1.0, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()

    run_app(port)

if __name__ == "__main__":
    main()
