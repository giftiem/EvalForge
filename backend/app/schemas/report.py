"""Run-report contracts."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.analysis import FailureAnalysis
from app.schemas.evaluation import EvaluationResult
from app.schemas.execution import ExecutionResult
from app.schemas.test_case import TestCase


class CategorySummary(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    category: str = Field(min_length=2, max_length=80)
    total: int = Field(ge=0)
    passed: int = Field(ge=0)
    pass_rate: float = Field(ge=0, le=1)


class RunReport(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    run_id: str = Field(min_length=3, max_length=100)
    started_at: datetime
    completed_at: datetime | None = None
    target_url: str = Field(min_length=1)
    iteration_count: int = Field(ge=0)
    total_tests: int = Field(ge=0)
    passed_tests: int = Field(ge=0)
    pass_rate: float = Field(ge=0, le=1)
    tests: list[TestCase] = Field(default_factory=list)
    executions: list[ExecutionResult] = Field(default_factory=list)
    evaluations: list[EvaluationResult] = Field(default_factory=list)
    failure_analyses: list[FailureAnalysis] = Field(default_factory=list)
    categories: list[CategorySummary] = Field(default_factory=list)
    unresolved_weak_areas: list[str] = Field(default_factory=list)

