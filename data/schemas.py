from typing import List, Optional
from pydantic import BaseModel, Field

class SearchBranchRequest(BaseModel):
    keyword: Optional[str] = None
    city_code: Optional[str] = None
    district_code: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)

class BranchItem(BaseModel):
    id: str
    code: str
    name: str
    address: str
    city_code: str
    phone: Optional[str] = None
    is_active: bool = True

class SearchBranchResponse(BaseModel):
    code: str = "00"
    message: str = "Success"
    total: int
    page: int
    page_size: int
    data: List[BranchItem]
