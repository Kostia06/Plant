import os
from pathlib import Path

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

MAX_VIDEO_DURATION = int(os.getenv("MAX_VIDEO_DURATION", "600"))
MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", "3"))

TEMP_DIR = Path("/tmp/videos")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

MAX_KEYFRAMES = 30
KEYFRAME_INTERVAL_SECONDS = 3
MAX_FRAME_HEIGHT = 720

GEMINI_MODEL = "gemini-2.0-flash"
