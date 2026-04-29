import uuid

from app.models.job import JobState, JobStatus


class JobStore:
    def __init__(self) -> None:
        self._store: dict[str, JobState] = {}

    def create(self) -> JobState:
        job_id = str(uuid.uuid4())
        job = JobState(job_id=job_id, status=JobStatus.pending)
        self._store[job_id] = job
        return job

    def update(self, job_id: str, **kwargs) -> JobState:
        job = self._store[job_id]
        updated = job.model_copy(update=kwargs)
        self._store[job_id] = updated
        return updated

    def get(self, job_id: str) -> JobState | None:
        return self._store.get(job_id)


job_store = JobStore()
