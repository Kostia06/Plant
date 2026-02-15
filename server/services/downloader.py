import logging
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp

from config import KEYFRAME_INTERVAL, MAX_KEYFRAMES, MAX_VIDEO_DURATION, TEMP_DIR

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
    return "other"


def download_and_extract(job_id: str, url: str) -> dict:
    job_dir = Path(TEMP_DIR) / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
        info = ydl.extract_info(url, download=False)

    duration = info.get("duration") or 0
    if duration > MAX_VIDEO_DURATION:
        raise ValueError(
            f"Video too long ({duration}s). Max is {MAX_VIDEO_DURATION}s."
        )

    title = info.get("title", "Unknown")
    platform = detect_platform(url)

    opts = {
        "format": "bestvideo[filesize<50M]+bestaudio/best[filesize<50M]/worst",
        "outtmpl": str(job_dir / "video.%(ext)s"),
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "socket_timeout": 30,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

    video_files = list(job_dir.glob("video.*"))
    if not video_files:
        raise FileNotFoundError("Video download failed — no output file found")
    video_path = video_files[0]

    audio_path = job_dir / "audio.mp3"
    subprocess.run(
        [
            "ffmpeg", "-i", str(video_path),
            "-q:a", "2", "-map", "a",
            "-y", str(audio_path),
        ],
        capture_output=True,
        check=True,
    )

    frames_dir = job_dir / "frames"
    frames_dir.mkdir(exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-i", str(video_path),
            "-vf", f"fps=1/{KEYFRAME_INTERVAL},scale='min(720,iw)':-1",
            "-q:v", "3",
            "-y", str(frames_dir / "frame_%03d.jpg"),
        ],
        capture_output=True,
        check=True,
    )

    keyframe_paths = sorted(frames_dir.glob("frame_*.jpg"))
    if len(keyframe_paths) > MAX_KEYFRAMES:
        for extra in keyframe_paths[MAX_KEYFRAMES:]:
            extra.unlink()
        keyframe_paths = keyframe_paths[:MAX_KEYFRAMES]

    return {
        "audio_path": str(audio_path),
        "keyframe_paths": [str(p) for p in keyframe_paths],
        "title": title,
        "platform": platform,
        "duration": duration,
    }


def cleanup(job_id: str) -> None:
    job_dir = Path(TEMP_DIR) / job_id
    try:
        if job_dir.exists():
            shutil.rmtree(job_dir)
    except Exception as e:
        logger.warning("Cleanup failed for %s: %s", job_dir, e)
