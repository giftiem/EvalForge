"""Identity and timing information for an EvalForge run."""

from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def generate_run_id(now: datetime | None = None) -> str:
    """Generate a sortable, human-readable, collision-resistant run ID."""

    timestamp = (now or datetime.now(UTC)).astimezone(UTC)
    return f"ef_{timestamp:%Y%m%dT%H%M%SZ}_{uuid4().hex[:10]}"


class RunContext(BaseModel):
    """Immutable context propagated through a complete test run."""

    model_config = ConfigDict(frozen=True)

    run_id: str = Field(default_factory=generate_run_id)
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

