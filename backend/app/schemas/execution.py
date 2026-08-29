"""Mechanical target-execution contracts."""

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ExecutionResult(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    test_id: str = Field(min_length=3, max_length=100)
    request: dict[str, object]
    response_text: str | None = None
    status_code: int | None = Field(default=None, ge=100, le=599)
    latency_ms: float = Field(ge=0)
    error: str | None = Field(default=None, max_length=5_000)
    trace_id: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def require_response_or_error(self) -> "ExecutionResult":
        if self.response_text is None and self.error is None:
            raise ValueError("execution result requires response_text or error")
        return self

