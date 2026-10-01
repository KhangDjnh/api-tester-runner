import pytest
from core.api_client import APIClient
from core.config import settings

@pytest.fixture(scope="session")
def api_client():
    """Fixture cung cấp APIClient với Authorization token đầy đủ."""
    client = APIClient()
    yield client
    client.close()

@pytest.fixture(scope="session")
def unauth_client():
    """Fixture cung cấp APIClient không có Auth token (để test mã 401)."""
    client = APIClient(token="")
    yield client
    client.close()

def pytest_html_report_title(report):
    report.title = "Báo Cáo Tự Động Hóa Kiểm Thử API & UI (Pytest)"

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Bổ sung thêm metadata và phân loại vào báo cáo HTML."""
    outcome = yield
    report = outcome.get_result()
    report.description = str(item.function.__doc__)
