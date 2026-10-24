import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Prevent OpenMP thread deadlocks between CTranslate2 and PyTorch/libiomp5 on macOS
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")


class Settings(BaseSettings):
    # Model configuration
    model_size: str = "large-v3"
    device: str = "cpu"
    compute_type: str = "int8"
    model_cache_dir: Optional[str] = None
    vad_filter: bool = False
    separate_vocals_default: str = "off"
    low_confidence_threshold: float = 0.4

    # Server configuration
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:3000,http://127.0.0.1:3000"

    # Upload & file handling
    max_upload_size_mb: int = 500
    temp_dir: Optional[str] = None

    # Alignment configuration
    alignment_method: str = "whisperx"  # whisperx or faster_whisper

    # Groq Cloud API configuration
    groq_api_key: Optional[str] = None
    groq_enabled: bool = True
    groq_model: str = "whisper-large-v3"
    groq_timeout_seconds: float = 30.0
    groq_max_file_size_bytes: int = 25 * 1024 * 1024  # 25 MB limit for Groq audio endpoint

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


settings = Settings()
