import json
import logging
import time

import google.generativeai as genai

from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

genai.configure(api_key=GEMINI_API_KEY)

ANALYSIS_PROMPT = """You are a video fact-checker and bias analyzer. You are given audio and key frames from a video.

Analyze BOTH the spoken content and visual content thoroughly.

For each verifiable claim (whether spoken or shown visually):
1. State the exact claim
2. Whether it was spoken, visual, or both
3. Approximate timestamp
4. Verdict: true, misleading, false, or unverified
5. Confidence score 0-1
6. Explanation of your verdict
7. Evidence for and against
8. Source URLs if you can reference specific known sources

Also identify:
- Overall political/ideological bias of the video
- Manipulation tactics used (emotional language, cherry-picked stats, misleading visuals, appeal to authority, false equivalence, straw man, etc.)
- Any misleading visuals (doctored images, truncated graphs, out-of-context footage)
- How left-leaning, centrist, and right-leaning sources would each frame this topic differently

Return your response as JSON with this exact structure:
{
  "title": "video title or topic",
  "summary": "brief summary of the video content",
  "transcript": "full transcript of spoken content",
  "claims": [
    {
      "claim": "the exact claim made",
      "type": "spoken|visual|both",
      "timestamp": "0:45",
      "verdict": "true|misleading|false|unverified",
      "confidence": 0.85,
      "explanation": "why this verdict",
      "evidence_for": ["source 1"],
      "evidence_against": ["source 1"],
      "sources": ["https://..."]
    }
  ],
  "perspectives": {
    "left": "how left-leaning sources frame this",
    "center": "neutral factual framing",
    "right": "how right-leaning sources frame this"
  },
  "bias_analysis": {
    "overall_bias": "left|lean_left|center|lean_right|right",
    "manipulation_tactics": ["tactic1", "tactic2"],
    "misleading_visuals": [
      {"timestamp": "1:23", "description": "description of misleading visual"}
    ]
  }
}"""

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2


def _upload_and_wait(path: str, mime_type: str) -> genai.types.File:
    uploaded = genai.upload_file(path, mime_type=mime_type)
    while uploaded.state.name == "PROCESSING":
        time.sleep(2)
        uploaded = genai.get_file(uploaded.name)
    if uploaded.state.name == "FAILED":
        raise RuntimeError(f"File processing failed: {path}")
    return uploaded


def _cleanup_files(files: list[genai.types.File]) -> None:
    for f in files:
        try:
            genai.delete_file(f.name)
        except Exception:
            pass


def analyze_video(audio_path: str, frame_paths: list[str]) -> dict:
    uploaded_files = []
    try:
        audio_file = _upload_and_wait(audio_path, "audio/mpeg")
        uploaded_files.append(audio_file)

        for path in frame_paths:
            frame_file = _upload_and_wait(path, "image/jpeg")
            uploaded_files.append(frame_file)

        model = genai.GenerativeModel(GEMINI_MODEL)
        contents = [ANALYSIS_PROMPT, audio_file, *uploaded_files[1:]]

        for attempt in range(MAX_RETRIES):
            try:
                response = model.generate_content(
                    contents,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                    ),
                )
                return json.loads(response.text)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    raise
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning("Gemini retry %d after error: %s", attempt + 1, e)
                time.sleep(delay)
    finally:
        _cleanup_files(uploaded_files)

    return {}
