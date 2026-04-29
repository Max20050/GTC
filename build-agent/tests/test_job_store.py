import pytest

from app.models.job import JobStatus
from app.models.response import BuildResponse
from app.services.job_store import JobStore


@pytest.fixture
def store():
    return JobStore()


def test_create_returns_pending_job(store):
    job = store.create()
    assert job.status == JobStatus.pending
    assert job.step is None
    assert job.result is None
    assert job.error is None


def test_create_assigns_unique_ids(store):
    ids = {store.create().job_id for _ in range(10)}
    assert len(ids) == 10


def test_pending_to_running_to_done(store):
    job = store.create()

    store.update(job.job_id, status=JobStatus.running, step="generating_plan")
    running = store.get(job.job_id)
    assert running.status == JobStatus.running
    assert running.step == "generating_plan"

    result = BuildResponse(plan=[], skills=[], prompts=[], assumptions=[], warnings=[])
    store.update(job.job_id, status=JobStatus.done, step=None, result=result)
    done = store.get(job.job_id)
    assert done.status == JobStatus.done
    assert done.step is None
    assert done.result is not None


def test_pending_to_running_to_failed(store):
    job = store.create()

    store.update(job.job_id, status=JobStatus.running, step="generating_plan")
    store.update(job.job_id, status=JobStatus.failed, step=None, error="LLM timeout")
    failed = store.get(job.job_id)
    assert failed.status == JobStatus.failed
    assert failed.error == "LLM timeout"
    assert failed.step is None


def test_get_unknown_job_id_returns_none(store):
    assert store.get("non-existent-id") is None


def test_update_does_not_mutate_other_jobs(store):
    job_a = store.create()
    job_b = store.create()

    store.update(job_a.job_id, status=JobStatus.running, step="generating_plan")

    assert store.get(job_b.job_id).status == JobStatus.pending
