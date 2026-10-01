import pytest
from playwright.sync_api import Page, expect
from core.config import settings

@pytest.mark.ui
class TestCMSLoginUI:
    """Kiểm thử giao diện (UI Testing) sử dụng Pytest + Playwright."""

    def test_login_successful(self, page: Page):
        """UI Test: Đăng nhập thành công với tài khoản hợp lệ."""
        # 1. Mở trang đăng nhập
        page.goto(f"{settings.BASE_URL}/login")

        # 2. Assert Title trang
        expect(page).to_have_title("Hệ Thống CMS - Đăng Nhập")

        # 3. Điền thông tin vào form
        page.locator("#username").fill("admin")
        page.locator("#password").fill("Admin@123")

        # 4. Click nút Đăng nhập
        page.locator("#btn-submit").click()

        # 5. Assert thông báo hiển thị trên giao diện
        status_msg = page.locator("#status-msg")
        expect(status_msg).to_contain_text("Đăng nhập thành công")

    def test_login_failed_with_wrong_password(self, page: Page):
        """UI Test: Hiển thị lỗi khi nhập sai mật khẩu."""
        page.goto(f"{settings.BASE_URL}/login")

        page.locator("#username").fill("admin")
        page.locator("#password").fill("WrongPassword!")
        page.locator("#btn-submit").click()

        status_msg = page.locator("#status-msg")
        expect(status_msg).to_contain_text("Sai tài khoản hoặc mật khẩu")
