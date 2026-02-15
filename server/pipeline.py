import logging
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp

from config import (
    KEYFRAME_INTERVAL_SECONDS,
    MAX_FRAME_HEIGHT,
    MAX_KEYFRAMES,
    MAX_VIDEO_DURATION,
    TEMP_DIR,
)
from cache import get_cached, store_result
from gemini_client import analyze_video

logger = logging.getLogger(__name__)

PLATFORM_MAP = {
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "instagram.com": "instagram",
    "tiktok.com": "tiktok",
    "twitter.com": "twitter",
    "x.com": "twitter",
    "facebook.com": "facebook",
    "fb.watch": "facebook",
    "reddit.com": "reddit",
}


def detect_platform(url: str) -> str:
    hostname = urlparse(url).hostname or ""
    for domain, platform in PLATFORM_MAP.items():
        if hostname.endswith(domain):
            return platform
    return "unknown"


def get_video_info(url: str) -> dict:
    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
        info = ydl.extract_info(url, download=False)
    return {
        "title": info.get("title", ""),
        "duration": info.get("duration") or 0,
    }


def download_video(url: str, job_dir: Path) -> Path:
    output_path = job_dir / "video.mp4"
    opts = {
        "format": "best[height<=720][ext=mp4]/best[height<=720]/best",
        "merge_output_format": "mp4",
        "outtmpl": str(output_path),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    return output_path


def extract_audio(video_path: Path, job_dir: Path) -> Path:
    audio_path = job_dir / "audio.mp3"
    subprocess.run(
        [
            "ffmpeg", "-i", str(video_path),
            "-vn", "-acodec", "libmp3lame", "-q:a", "4",
            "-y", str(audio_path),
        ],
        capture_output=True,
        check=True,
    )
    return audio_path


def extract_keyframes(video_path: Path, job_dir: Path) -> list[Path]:
    frames_dir = job_dir / "frames"
    frames_dir.mkdir(exist_ok=True)

    subprocess.run(
        [
            "ffmpeg", "-i", str(video_path),
            "-vf", f"fps=1/{KEYFRAME_INTERVAL_SECONDS},scale=-1:{MAX_FRAME_HEIGHT}",
            "-q:v", "3",
            "-y", str(frames_dir / "frame_%04d.jpg"),
        ],
        capture_output=True,
        check=True,
    )

    frames = sorted(frames_dir.glob("frame_*.jpg"))
    if len(frames) > MAX_KEYFRAMES:
        step = len(frames) / MAX_KEYFRAMES
        frames = [frames[int(i * step)] for i in range(MAX_KEYFRAMES)]
    return frames


def cleanup(job_dir: Path) -> None:
    try:
        if job_dir.exists():
            shutil.rmtree(job_dir)
    except Exception as e:
        logger.warning("Cleanup failed for %s: %s", job_dir, e)


def process_video(job_id: str, url: str, jobs: dict) -> None:
    job_dir = TEMP_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    try:
        cached = get_cached(url)
        if cached:
            jobs[job_id]["status"] = "complete"
            jobs[job_id]["results"] = cached
            return

        info = get_video_info(url)
        duration = info["duration"]

        if duration > MAX_VIDEO_DURATION:
            raise ValueError(
                f"Video too long ({duration}s). Max is {MAX_VIDEO_DURATION}s."
            )

        video_path = download_video(url, job_dir)
        audio_path = extract_audio(video_path, job_dir)
        frame_paths = extract_keyframes(video_path, job_dir)

        analysis = analyze_video(
            str(audio_path),
            [str(p) for p in frame_paths],
        )

        platform = detect_platform(url)
        results = {
            "title": analysis.get("title", info["title"]),
            "platform": platform,
            "duration_seconds": duration,
            "summary": analysis.get("summary", ""),
            "transcript": analysis.get("transcript", ""),
            "claims": analysis.get("claims", []),
            "perspectives": analysis.get("perspectives", {}),
            "bias_analysis": analysis.get("bias_analysis", {}),
        }

        store_result(url, results)

        jobs[job_id]["status"] = "complete"
        jobs[job_id]["results"] = results

    except Exception as e:
        logger.exception("Job %s failed", job_id)
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
    finally:
        cleanup(job_dir)
