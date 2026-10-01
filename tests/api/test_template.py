import pytest
from core.api_client import APIClient

# DANH SÁCH PAYLOAD CHO CÁC TEST CASE
# Cấu trúc mỗi phần tử: (Tên kịch bản, Payload dict, HTTP Status mong muốn)
TEST_CASES = [
    # ("Case 1: Mẫu hợp lệ", {"field": "value"}, 200),
]

@pytest.mark.api
@pytest.mark.parametrize("case_name, payload, expected_status", TEST_CASES)
def test_api_batch_runner(api_client: APIClient, case_name: str, payload: dict, expected_status: int):
    """
    Template kiểm thử tự động hàng loạt payload (Data-Driven Testing).
    Thay thế endpoint 'your-endpoint' bằng đường dẫn API thật của bạn.
    """
    endpoint = "your-endpoint"
    response = api_client.post(endpoint, json_data=payload)
    response.assert_status(expected_status)
