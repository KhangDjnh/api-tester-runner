from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class BaseAPIRequest(BaseModel):
    """Mẫu schema cơ bản cho Request payload (tùy biến theo API của bạn)."""
    pass

class BaseAPIResponse(BaseModel):
    """Mẫu schema cơ bản cho Response payload."""
    code: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Any] = None
