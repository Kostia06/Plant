import base64
import json
import logging
import time
from pathlib import Path

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


def _inline_part(path: str, mime_type: str) -> dict:
    data = Path(path).read_bytes()
    return {
        "inline_data": {
            "mime_type": mime_type,
            "data": base64.b64encode(data).decode(),
        }
    }


def analyze_video(audio_path: str, frame_paths: list[str]) -> dict:
    model = genai.GenerativeModel(GEMINI_MODEL)

    contents = [ANALYSIS_PROMPT]
    contents.append(_inline_part(audio_path, "audio/mpeg"))
    for path in frame_paths:
        contents.append(_inline_part(path, "image/jpeg"))

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

    return {}
