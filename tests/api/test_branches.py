import pytest
from core.api_client import APIClient
from data.schemas import SearchBranchResponse

@pytest.mark.api
@pytest.mark.smoke
class TestBranchSearchHappyPath:
    """Kiểm thử luồng thành công chính (Happy Path) cho API Tìm kiếm Chi Nhánh."""

    def test_search_all_branches(self, api_client: APIClient):
        """Happy Path: Tìm kiếm không filter, trả về dữ liệu mặc định và đúng Schema."""
        response = api_client.post("branches/search", json_data={"page": 1, "page_size": 10})
        
        # 1. Assert status code 200
        response.assert_status(200)

        # 2. Assert Business code
        response.assert_json_field("code", "00")

        # 3. Assert Response Contract bằng Pydantic Model (Validate cấu trúc dữ liệu trả về)
        validated = SearchBranchResponse(**response.json)
        assert validated.total >= 0
        assert len(validated.data) <= 10

    def test_search_filter_by_city(self, api_client: APIClient):
        """Happy Path: Filter theo thành phố (city_code='HN')."""
        payload = {"city_code": "HN", "page": 1, "page_size": 10}
        response = api_client.post("branches/search", json_data=payload)
        
        response.assert_status(200)
        data = response.json.get("data", [])
        assert len(data) > 0
        assert all(item["city_code"] == "HN" for item in data)


@pytest.mark.api
@pytest.mark.regression
class TestBranchSearchValidation:
    """
    DATA-DRIVEN TESTING:
    Chỉ với 1 hàm duy nhất, quét sạch mọi test case biên (Boundary / Validation).
    Tiết kiệm 80% thời gian so với việc test tay từng case trên Postman!
    """

    @pytest.mark.parametrize(
        "case_name, payload, expected_status, expected_error_code",
        [
            ("Page âm (page=-1)", {"page": -1, "page_size": 10}, 400, "INVALID_PAGE"),
            ("Page bằng 0 (page=0)", {"page": 0, "page_size": 10}, 400, "INVALID_PAGE"),
            ("Page_size âm (page_size=-5)", {"page": 1, "page_size": -5}, 400, "INVALID_PAGE_SIZE"),
            ("Page_size bằng 0 (page_size=0)", {"page": 1, "page_size": 0}, 400, "INVALID_PAGE_SIZE"),
            ("Page_size vượt giới hạn (page_size=101)", {"page": 1, "page_size": 101}, 400, "INVALID_PAGE_SIZE"),
            ("Page dạng chuỗi (page='abc')", {"page": "abc", "page_size": 10}, 400, "INVALID_PAGE"),
        ]
    )
    def test_boundary_validation_matrix(
        self,
        api_client: APIClient,
        case_name: str,
        payload: dict,
        expected_status: int,
        expected_error_code: str
    ):
        """Kiểm tra phản hồi lỗi khi client gửi payload không hợp lệ."""
        response = api_client.post("branches/search", json_data=payload)
        response.assert_status(expected_status)
        response.assert_json_field("code", expected_error_code)


@pytest.mark.api
class TestBranchSecurity:
    """Kiểm thử bảo mật (Authentication / Authorization)."""

    def test_unauthorized_access(self, unauth_client: APIClient):
        """Bảo mật: Từ chối truy cập 401 khi không truyền Authorization Token."""
        response = unauth_client.post("branches/search", json_data={"page": 1})
        response.assert_status(401)
