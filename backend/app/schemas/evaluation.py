"""Evaluation contracts."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class FailureType(StrEnum):
    HALLUCINATION = "hallucination"
    ROUTING = "routing"
    INCONSISTENCY = "inconsistency"
    REFUSAL = "refusal"
    SECURITY = "security"
    UNKNOWN_INPUT = "unknown_input"
    CONTRACT_ERROR = "contract_error"
    TIMEOUT = "timeout"
    INFRASTRUCTURE = "infrastructure"
    OTHER = "other"


class EvaluationResult(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    test_id: str = Field(min_length=3, max_length=100)
    passed: bool
    rule_score: float = Field(ge=0, le=1)
    judge_score: float | None = Field(default=None, ge=0, le=1)
    reason: str = Field(min_length=1, max_length=10_000)
    failure_type: FailureType | None = None

