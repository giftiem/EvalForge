"""Test-generation contracts."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TestPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TestSource(StrEnum):
    INITIAL = "initial"
    ADAPTIVE = "adaptive"
    MANUAL = "manual"


class TestCase(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    id: str = Field(min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$")
    category: str = Field(min_length=2, max_length=80)
    input: str = Field(min_length=1, max_length=20_000)
    expected_behavior: str = Field(min_length=1, max_length=10_000)
    evaluation_rules: list[str] = Field(default_factory=list, max_length=50)
    priority: TestPriority = TestPriority.MEDIUM
    source: TestSource = TestSource.INITIAL
    parent_failure_id: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def require_adaptive_parent(self) -> "TestCase":
        if self.source is TestSource.ADAPTIVE and not self.parent_failure_id:
            raise ValueError("adaptive tests require parent_failure_id")
        return self

