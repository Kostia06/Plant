import uuid
import logging

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import MAX_CONCURRENT_JOBS
from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    HealthResponse,
    JobStatusResponse,
    VideoAnalysis,
)
from pipeline import process_video
from cache import get_cached

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Video Truth Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict[str, dict] = {}


@app.post("/api/analyze")
def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks) -> AnalyzeResponse:
    url = str(request.url)

    cached = get_cached(url)
    if cached:
        job_id = uuid.uuid4().hex
        jobs[job_id] = {"status": "complete", "results": cached}
        return AnalyzeResponse(job_id=job_id, status="complete")

    active_count = sum(1 for j in jobs.values() if j["status"] == "processing")
    if active_count >= MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=429,
            detail="Too many concurrent jobs. Try again shortly.",
        )

    job_id = uuid.uuid4().hex
    jobs[job_id] = {"status": "processing", "results": None, "error": None}

    background_tasks.add_task(process_video, job_id, url, jobs)

    return AnalyzeResponse(job_id=job_id, status="processing")


@app.get("/api/status/{job_id}")
def get_status(job_id: str) -> JobStatusResponse:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    results = None
    if job["results"]:
        results = VideoAnalysis(**job["results"])

    return JobStatusResponse(
        status=job["status"],
        results=results,
        error=job.get("error"),
    )


@app.get("/api/health")
def health() -> HealthResponse:
    return HealthResponse()
