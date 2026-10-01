import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    BASE_URL: str = os.getenv("BASE_URL", "http://127.0.0.1:8000")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api/v1")
    TIMEOUT: float = float(os.getenv("TIMEOUT", "10.0"))
    AUTH_TOKEN: str = os.getenv("AUTH_TOKEN", "")
    ENV: str = os.getenv("ENV", "dev")
    HEADLESS: bool = os.getenv("HEADLESS", "true").lower() in ("true", "1", "yes")

    @classmethod
    def get_full_url(cls, endpoint: str) -> str:
        base = cls.BASE_URL.rstrip("/")
        prefix = cls.API_PREFIX.strip("/")
        ep = endpoint.lstrip("/")
        if prefix:
            return f"{base}/{prefix}/{ep}"
        return f"{base}/{ep}"

settings = Settings()
