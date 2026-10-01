import time
import json
from typing import Any, Dict, Optional
import httpx
from core.config import settings

class APIResponse:
    """Wrapper cho HTTP response để tiện debug và assert."""
    def __init__(self, response: httpx.Response, elapsed_ms: float, curl_cmd: str):
        self.raw = response
        self.status_code = response.status_code
        self.headers = response.headers
        self.elapsed_ms = elapsed_ms
        self.curl = curl_cmd

    @property
    def json(self) -> Any:
        try:
            return self.raw.json()
        except Exception:
            return None

    @property
    def text(self) -> str:
        return self.raw.text

    def assert_status(self, expected_status: int):
        assert self.status_code == expected_status, (
            f"\n❌ Status Code Mismatch!"
            f"\n- Expected: {expected_status}"
            f"\n- Actual:   {self.status_code}"
            f"\n- Latency:  {self.elapsed_ms:.1f}ms"
            f"\n- Response: {self.text[:500]}"
            f"\n- cURL:\n  {self.curl}\n"
        )
        return self

    def assert_json_field(self, key: str, expected_value: Any = None):
        data = self.json
        assert isinstance(data, dict), f"Response is not a JSON object: {self.text}"
        assert key in data, f"Key '{key}' not found in response JSON: {list(data.keys())}"
        if expected_value is not None:
            assert data[key] == expected_value, (
                f"Field '{key}' expected '{expected_value}', but got '{data[key]}'"
            )
        return self


class APIClient:
    """HTTP Client trung tâm cho các bài test API."""
    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
        self.base_url = (base_url or settings.BASE_URL).rstrip("/")
        self.client = httpx.Client(
            timeout=settings.TIMEOUT,
            follow_redirects=True
        )
        self.token = settings.AUTH_TOKEN if token is None else token

    def _build_headers(self, custom_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if custom_headers:
            headers.update(custom_headers)
        return headers

    def _generate_curl(self, method: str, url: str, headers: Dict[str, str], json_data: Any = None) -> str:
        parts = [f"curl -X {method} '{url}'"]
        for k, v in headers.items():
            parts.append(f"-H '{k}: {v}'")
        if json_data is not None:
            parts.append(f"-d '{json.dumps(json_data)}'")
        return " \\\n    ".join(parts)

    def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> APIResponse:
        url = settings.get_full_url(endpoint)
        req_headers = self._build_headers(headers)
        curl_cmd = self._generate_curl(method, url, req_headers, json_data)

        start = time.perf_counter()
        resp = self.client.request(
            method=method,
            url=url,
            params=params,
            json=json_data,
            headers=req_headers
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        return APIResponse(resp, elapsed_ms, curl_cmd)

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None, **kwargs) -> APIResponse:
        return self.request("GET", endpoint, params=params, **kwargs)

    def post(self, endpoint: str, json_data: Optional[Any] = None, **kwargs) -> APIResponse:
        return self.request("POST", endpoint, json_data=json_data, **kwargs)

    def put(self, endpoint: str, json_data: Optional[Any] = None, **kwargs) -> APIResponse:
        return self.request("PUT", endpoint, json_data=json_data, **kwargs)

    def delete(self, endpoint: str, **kwargs) -> APIResponse:
        return self.request("DELETE", endpoint, **kwargs)

    def close(self):
        self.client.close()
