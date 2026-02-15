import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from config import MAX_CONCURRENT_JOBS
from models.schemas import (
    AnalyzeRequest,
    AnalysisResult,
    JobResponse,
    JobStatus,
    StatusResponse,
)
from services import analyzer, cache, downloader

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

jobs: dict[str, dict] = {}


@router.post("/analyze")
def analyze_video(
    request: AnalyzeRequest, background_tasks: BackgroundTasks
) -> JobResponse:
    url = request.url

    cached = cache.get_cached(url)
    if cached:
        job_id = uuid.uuid4().hex
        jobs[job_id] = {
            "status": JobStatus.COMPLETE,
            "results": cached,
            "error": None,
        }
        return JobResponse(job_id=job_id, status=JobStatus.COMPLETE)

    active = sum(1 for j in jobs.values() if j["status"] == JobStatus.PROCESSING)
    if active >= MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=429, detail="Too many concurrent jobs. Try again shortly."
        )

    job_id = uuid.uuid4().hex
    jobs[job_id] = {"status": JobStatus.PROCESSING, "results": None, "error": None}

    background_tasks.add_task(process_video, job_id, url, request.user_id)

    return JobResponse(job_id=job_id, status=JobStatus.PROCESSING)


@router.get("/status/{job_id}")
def get_status(job_id: str) -> StatusResponse:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    results = None
    if job["results"]:
        if isinstance(job["results"], AnalysisResult):
            results = job["results"]
        else:
            results = AnalysisResult(**job["results"])

    return StatusResponse(
        job_id=job_id,
        status=job["status"],
        results=results,
        error=job.get("error"),
    )


def process_video(job_id: str, url: str, user_id: str | None) -> None:
    try:
        media = downloader.download_and_extract(job_id, url)

        result = analyzer.analyze(
            media["audio_path"],
            media["keyframe_paths"],
        )

        result.platform = media["platform"]
        result.duration_seconds = int(media["duration"]) if media["duration"] else None
        if not result.title or result.title == "Unknown":
            result.title = media["title"]

        analysis_id = cache.store_result(url, result)

        if user_id and analysis_id:
            cache.record_user_analysis(user_id, analysis_id, result.points_awarded)

        jobs[job_id]["status"] = JobStatus.COMPLETE
        jobs[job_id]["results"] = result

    except Exception as e:
        logger.exception("Job %s failed", job_id)
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["error"] = str(e)
    finally:
        downloader.cleanup(job_id)
