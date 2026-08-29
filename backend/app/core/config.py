"""Validated application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AnyHttpUrl, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """EvalForge settings with safe bounds for external calls and run budgets."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="EVALFORGE_",
        extra="ignore",
        validate_default=True,
    )

    environment: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    runs_directory: Path = Path("runs")

    target_url: AnyHttpUrl
    target_timeout_seconds: float = Field(default=30.0, gt=0, le=300)
    target_max_retries: int = Field(default=2, ge=0, le=10)
    target_max_concurrency: int = Field(default=5, ge=1, le=50)

    max_iterations: int = Field(default=3, ge=1, le=20)
    max_tests_per_run: int = Field(default=100, ge=1, le=10_000)
    target_pass_rate: float = Field(default=0.90, ge=0, le=1)

    llm_model: str = Field(min_length=1)
    llm_api_key: SecretStr

    langfuse_host: AnyHttpUrl = AnyHttpUrl("https://cloud.langfuse.com")
    langfuse_public_key: str = Field(min_length=1)
    langfuse_secret_key: SecretStr


@lru_cache
def get_settings() -> Settings:
    """Return one validated settings instance for the process."""

    return Settings()  # type: ignore[call-arg]

