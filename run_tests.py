#!/usr/bin/env python3
import sys
import os
import subprocess
import argparse
import webbrowser
from pathlib import Path
from mock_server import run_mock_server

PROJECT_DIR = Path(__file__).resolve().parent
REPORTS_DIR = PROJECT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)
REPORT_FILE = REPORTS_DIR / "test_report.html"

def main():
    parser = argparse.ArgumentParser(description="Runner kiểm thử tự động API & UI bằng Pytest")
    parser.add_argument("--api", action="store_true", help="Chỉ chạy API tests")
    parser.add_argument("--ui", action="store_true", help="Chỉ chạy UI tests (Playwright)")
    parser.add_argument("--smoke", action="store_true", help="Chạy smoke tests nhanh")
    parser.add_argument("--headed", action="store_true", help="Chạy UI test có hiện cửa sổ trình duyệt")
    parser.add_argument("--mock", action="store_true", default=True, help="Khởi động mock server tự động để test demo")
    parser.add_argument("--no-mock", action="store_false", dest="mock", help="Không chạy mock server (dùng server thật trong .env)")
    parser.add_argument("--open-report", action="store_true", help="Tự động mở file báo cáo HTML sau khi chạy")

    args = parser.parse_args()

    # Khởi động mock server nếu được yêu cầu
    if args.mock:
        print("🚀 Đang khởi động Mock Server tại http://127.0.0.1:8000 ...")
        run_mock_server(8000)

    # Xây dựng lệnh pytest
    pytest_bin = str(PROJECT_DIR / ".venv" / "bin" / "pytest")
    if not os.path.exists(pytest_bin):
        pytest_bin = "pytest"

    cmd = [pytest_bin]

    if args.api:
        cmd.extend(["-m", "api"])
    elif args.ui:
        cmd.extend(["-m", "ui"])
    elif args.smoke:
        cmd.extend(["-m", "smoke"])

    if args.headed:
        cmd.append("--headed")

    cmd.extend([
        f"--html={REPORT_FILE}",
        "--self-contained-html"
    ])

    print(f"▶️ Thực thi: {' '.join(cmd)}\n")
    result = subprocess.run(cmd, cwd=str(PROJECT_DIR))

    print(f"\n📊 Báo cáo kết quả HTML đã được tạo tại:")
    print(f"   file://{REPORT_FILE}")

    if args.open_report:
        webbrowser.open(f"file://{REPORT_FILE}")

    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
