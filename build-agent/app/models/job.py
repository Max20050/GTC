from enum import Enum

from pydantic import BaseModel

from app.models.response import BuildResponse


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class JobState(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.pending
    step: str | None = None
    result: BuildResponse | None = None
    error: str | None = None
