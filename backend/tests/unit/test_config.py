from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings


VALID_SETTINGS = {
    "target_url": "https://example.com/chat",
    "llm_model": "example-model",
    "llm_api_key": "secret-llm-key",
    "langfuse_public_key": "public-key",
    "langfuse_secret_key": "secret-langfuse-key",
}


def test_valid_settings_load_with_safe_defaults() -> None:
    settings = Settings(_env_file=None, **VALID_SETTINGS)

    assert str(settings.target_url) == "https://example.com/chat"
    assert settings.target_timeout_seconds == 30
    assert settings.max_iterations == 3
    assert settings.runs_directory == Path("runs")


def test_missing_required_settings_raise_clear_error() -> None:
    with pytest.raises(ValidationError) as error:
        Settings(_env_file=None)

    missing_fields = {item["loc"][0] for item in error.value.errors() if item["type"] == "missing"}
    assert missing_fields == {
        "target_url",
        "llm_model",
        "llm_api_key",
        "langfuse_public_key",
        "langfuse_secret_key",
    }


@pytest.mark.parametrize(
    ("field", "value"),
    [("target_timeout_seconds", 0), ("max_iterations", 0), ("target_pass_rate", 1.1)],
)
def test_unsafe_limits_are_rejected(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **VALID_SETTINGS, **{field: value})

