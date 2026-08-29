"""Failure-analysis contracts."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.evaluation import FailureType


class FailureAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    test_id: str = Field(min_length=3, max_length=100)
    failure_type: FailureType
    is_product_failure: bool
    explanation: str = Field(min_length=1, max_length=10_000)
    evidence: list[str] = Field(min_length=1, max_length=50)
    recommended_follow_ups: list[str] = Field(default_factory=list, max_length=50)

