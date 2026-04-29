from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException

from app.auth import verify_token
from app.config import settings
from app.models.job import JobStatus
from app.models.request import BuildRequest
from app.models.response import BuildResponse
from app.services import canvas_reader, plan_generator, skill_recommender
from app.services.job_store import job_store

app = FastAPI(title="build-agent", version="0.1.0")


def _run_build(job_id: str, request: BuildRequest) -> None:
    warnings: list[str] = []
    try:
        job_store.update(job_id, status=JobStatus.running, step="generating_plan")

        ctx = canvas_reader.read_canvas(
            request.canvas,
            request.target_node_id,
            request.options.stack,
        )
        plan = plan_generator.generate_plan(ctx, request.options.detail_level)

        job_store.update(job_id, step="recommending_skills")

        try:
            skills = skill_recommender.recommend_skills(ctx, ctx.stack)
        except Exception as exc:
            skills = []
            warnings.append(f"Skills recommendation failed: {exc}")

        result = BuildResponse(
            plan=plan.steps,
            skills=skills,
            prompts=plan.prompts,
            assumptions=plan.assumptions,
            warnings=warnings,
        )
        job_store.update(job_id, status=JobStatus.done, step=None, result=result)

    except Exception as exc:
        job_store.update(job_id, status=JobStatus.failed, step=None, error=str(exc))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/build", status_code=202)
def post_build(
    request: BuildRequest,
    background_tasks: BackgroundTasks,
    _token: dict = Depends(verify_token),
):
    job = job_store.create()
    background_tasks.add_task(_run_build, job.job_id, request)
    return {"job_id": job.job_id}


@app.get("/jobs/{job_id}")
def get_job(job_id: str, _token: dict = Depends(verify_token)):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=settings.env == "development")
